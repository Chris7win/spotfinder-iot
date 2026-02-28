import { useState, useEffect } from 'react'
import { supabase } from '../supabase/client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { Download, FileSpreadsheet } from 'lucide-react'
import './Accounting.css'

function startOf(unit) {
  const d = new Date()
  if (unit === 'day')   { d.setHours(0,0,0,0); return d }
  if (unit === 'week')  { d.setDate(d.getDate() - d.getDay()); d.setHours(0,0,0,0); return d }
  if (unit === 'month') { d.setDate(1); d.setHours(0,0,0,0); return d }
  return d
}

function sum(arr, key) {
  return arr.reduce((s, r) => s + (r[key] || 0), 0)
}

function getLast7Days() {
  const days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0,0,0,0)
    days.push(d.toISOString().split('T')[0])
  }
  return days
}

function Accounting() {
  const [bills, setBills]   = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast]   = useState('')

  const notify = (m) => { setToast(m); setTimeout(() => setToast(''), 3000) }

  useEffect(() => {
    const load = async () => {
      const monthStart = startOf('month').toISOString()
      const { data } = await supabase
        .from('bills')
        .select('*')
        .gte('created_at', monthStart)
        .order('created_at')
      if (data) setBills(data)
      setLoading(false)
    }
    load()
  }, [])

  const walkin  = bills.filter(b => b.type === 'walkin'  && b.payment_status === 'paid')
  const booked  = bills.filter(b => b.type === 'booked'  && b.payment_status === 'paid')

  const dayStart   = startOf('day').toISOString()
  const weekStart  = startOf('week').toISOString()
  const monthStart = startOf('month').toISOString()

  const wRevDay   = sum(walkin.filter(b => b.created_at >= dayStart),   'amount')
  const wRevWeek  = sum(walkin.filter(b => b.created_at >= weekStart),  'amount')
  const wRevMonth = sum(walkin, 'amount')
  const wCash     = sum(walkin.filter(b => b.payment_method?.toLowerCase() === 'cash'), 'amount')
  const wUPI      = sum(walkin.filter(b => b.payment_method?.toLowerCase() === 'upi'),  'amount')

  const bRevDay   = sum(booked.filter(b => b.created_at >= dayStart),   'amount')
  const bRevWeek  = sum(booked.filter(b => b.created_at >= weekStart),  'amount')
  const bRevMonth = sum(booked, 'amount')

  const totalMonthly = wRevMonth + bRevMonth

  // Bar chart data — last 7 days
  const days = getLast7Days()
  const chartData = days.map(date => {
    const wi = sum(walkin.filter(b => b.created_at?.startsWith(date)), 'amount')
    const bo = sum(booked.filter(b => b.created_at?.startsWith(date)), 'amount')
    return { day: date.slice(5), walkIn: wi, booking: bo }
  })

  // Download Monthly PDF Report
  const downloadPDF = () => {
    const doc = new jsPDF()
    doc.setFontSize(16); doc.setFont('helvetica', 'bold')
    doc.text('SpotFinder IOT — Monthly Revenue Report', 14, 18)
    doc.setFontSize(10); doc.setFont('helvetica', 'normal')
    doc.text(`Month: ${new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}`, 14, 26)
    doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, 14, 32)

    autoTable(doc, {
      startY: 40,
      head: [['Category', 'Today', 'This Week', 'This Month']],
      body: [
        ['Walk-in Income', `₹${wRevDay}`, `₹${wRevWeek}`, `₹${wRevMonth}`],
        ['App Booking Income', `₹${bRevDay}`, `₹${bRevWeek}`, `₹${bRevMonth}`],
        ['Combined Total', `₹${wRevDay+bRevDay}`, `₹${wRevWeek+bRevWeek}`, `₹${totalMonthly}`],
      ],
      styles: { fontSize: 10 },
      headStyles: { fillColor: [26, 26, 46] },
    })

    const nextY = doc.lastAutoTable.finalY + 10
    autoTable(doc, {
      startY: nextY,
      head: [['Bill ID', 'Type', 'Customer', 'Vehicle', 'Slot', 'Duration (min)', 'Amount', 'Method', 'Date']],
      body: bills.filter(b => b.payment_status === 'paid').map(b => [
        b.bill_id?.toString().slice(-6) || '—',
        b.type,
        b.user_name || '—',
        b.vehicle_number || '—',
        b.slot_id,
        b.duration_minutes || '—',
        `₹${b.amount}`,
        b.payment_method || '—',
        b.created_at ? new Date(b.created_at).toLocaleDateString('en-IN') : '—',
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [52, 152, 219] },
    })

    doc.save(`SpotFinder_Monthly_Report_${new Date().toISOString().slice(0,7)}.pdf`)
    notify('PDF report downloaded')
  }

  // Download Excel
  const downloadExcel = () => {
    const rows = bills.filter(b => b.payment_status === 'paid').map(b => ({
      'Bill ID':        b.bill_id,
      'Type':           b.type,
      'Customer':       b.user_name || '—',
      'Vehicle':        b.vehicle_number || '—',
      'Slot':           b.slot_id,
      'Duration (min)': b.duration_minutes || 0,
      'Amount (₹)':     b.amount,
      'Method':         b.payment_method || '—',
      'Date':           b.created_at ? new Date(b.created_at).toLocaleDateString('en-IN') : '',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Monthly Revenue')
    XLSX.writeFile(wb, `SpotFinder_Revenue_${new Date().toISOString().slice(0,7)}.xlsx`)
    notify('Excel downloaded')
  }

  if (loading) return <div className="ac-loading">Loading accounting data...</div>

  return (
    <div className="ac-wrap">
      {toast && <div className="ac-toast">{toast}</div>}

      <div className="ac-row">
        {/* Walk-in Income Panel */}
        <div className="ac-panel">
          <h3 className="ac-panel-title" style={{ color: '#f39c12' }}>Walk-in Income</h3>
          <div className="ac-period-grid">
            <div className="ac-period-card">
              <span className="ac-period-label">Today</span>
              <span className="ac-period-value" style={{ color: '#f39c12' }}>₹{wRevDay}</span>
            </div>
            <div className="ac-period-card">
              <span className="ac-period-label">This Week</span>
              <span className="ac-period-value" style={{ color: '#f39c12' }}>₹{wRevWeek}</span>
            </div>
            <div className="ac-period-card">
              <span className="ac-period-label">This Month</span>
              <span className="ac-period-value" style={{ color: '#f39c12' }}>₹{wRevMonth}</span>
            </div>
          </div>
          <div className="ac-method-row">
            <div className="ac-method-card">
              <span>Cash</span>
              <strong>₹{wCash}</strong>
            </div>
            <div className="ac-method-card">
              <span>UPI</span>
              <strong>₹{wUPI}</strong>
            </div>
          </div>
        </div>

        {/* App Booking Income Panel */}
        <div className="ac-panel">
          <h3 className="ac-panel-title" style={{ color: '#3498db' }}>App Booking Income</h3>
          <div className="ac-period-grid">
            <div className="ac-period-card">
              <span className="ac-period-label">Today</span>
              <span className="ac-period-value" style={{ color: '#3498db' }}>₹{bRevDay}</span>
            </div>
            <div className="ac-period-card">
              <span className="ac-period-label">This Week</span>
              <span className="ac-period-value" style={{ color: '#3498db' }}>₹{bRevWeek}</span>
            </div>
            <div className="ac-period-card">
              <span className="ac-period-label">This Month</span>
              <span className="ac-period-value" style={{ color: '#3498db' }}>₹{bRevMonth}</span>
            </div>
          </div>
          <div className="ac-method-row">
            <div className="ac-method-card">
              <span>App Pay</span>
              <strong>₹{bRevMonth}</strong>
            </div>
            <div className="ac-method-card">
              <span>Bookings</span>
              <strong>{booked.length}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="ac-panel">
        <h3 className="ac-panel-title">Walk-in vs Booking — Daily Income (This Week)</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="day" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v) => `₹${v}`} />
            <Legend />
            <Bar dataKey="walkIn"  name="Walk-in"  fill="#f39c12" radius={[4,4,0,0]} />
            <Bar dataKey="booking" name="Booking"  fill="#3498db" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Total Summary */}
      <div className="ac-panel ac-total-panel">
        <div className="ac-total-left">
          <div className="ac-total-label">Combined Monthly Revenue</div>
          <div className="ac-total-value">₹{totalMonthly}</div>
          <div className="ac-total-sub">Walk-in ₹{wRevMonth} + Bookings ₹{bRevMonth}</div>
        </div>
        <div className="ac-total-actions">
          <button className="ac-btn pdf" onClick={downloadPDF}>
            <Download size={15} /> Monthly PDF Report
          </button>
          <button className="ac-btn excel" onClick={downloadExcel}>
            <FileSpreadsheet size={15} /> Download Excel
          </button>
        </div>
      </div>
    </div>
  )
}

export default Accounting
