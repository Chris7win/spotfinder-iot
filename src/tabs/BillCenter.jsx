import { useState, useEffect } from 'react'
import { supabase } from '../supabase/client'
import { Printer, MessageCircle, Eye } from 'lucide-react'
import './BillCenter.css'

function fmtDuration(minutes) {
  if (!minutes) return '—'
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  if (h === 0) return `${m} min`
  if (m === 0) return `${h} hr`
  return `${h} hr ${m} min`
}

function printBill(b) {
  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>SpotFinder Bill #${b.bill_id}</title>
<style>
  body { font-family: 'Courier New', monospace; width: 80mm; margin: 0 auto; padding: 8px; font-size: 12px; }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .divider { border-top: 1px dashed #555; margin: 6px 0; }
  .row { display: flex; justify-content: space-between; margin: 3px 0; }
  .title { font-size: 16px; font-weight: bold; text-align: center; }
  .amount-row { font-size: 14px; font-weight: bold; margin: 4px 0; }
  @media print { body { width: 80mm; } }
</style>
</head>
<body>
<div class="title">SPOTFINDER IOT</div>
<div class="center">Parking Receipt</div>
<div class="divider"></div>
<div class="row"><span>Bill No:</span><span>#${b.bill_id}</span></div>
<div class="row"><span>Date:</span><span>${b.created_at ? new Date(b.created_at).toLocaleDateString('en-IN') : '—'}</span></div>
<div class="row"><span>Entry:</span><span>${b.entry_time ? new Date(b.entry_time).toLocaleString('en-IN') : '—'}</span></div>
<div class="row"><span>Exit:</span><span>${b.exit_time ? new Date(b.exit_time).toLocaleString('en-IN') : '—'}</span></div>
<div class="divider"></div>
<div class="row"><span>Customer:</span><span>${b.user_name || '—'}</span></div>
<div class="row"><span>Phone:</span><span>${b.phone || '—'}</span></div>
<div class="row"><span>Vehicle No:</span><span>${b.vehicle_number || '—'}</span></div>
<div class="row"><span>Type:</span><span>${b.vehicle_type || '—'}</span></div>
<div class="divider"></div>
<div class="row"><span>Slot:</span><span>${b.slot_id}</span></div>
<div class="row"><span>Duration:</span><span>${fmtDuration(b.duration_minutes)}</span></div>
<div class="divider"></div>
<div class="row amount-row"><span>TOTAL:</span><span>\u20B9${b.amount}</span></div>
<div class="row"><span>Payment:</span><span>${b.payment_method || '—'}</span></div>
<div class="row bold"><span>Status:</span><span>PAID</span></div>
<div class="divider"></div>
<div class="center">Thank you for using SpotFinder!</div>
</body></html>`
  const w = window.open('', '_blank', 'width=400,height=600')
  w.document.write(html)
  w.document.close()
  w.focus()
  setTimeout(() => { w.print(); w.close() }, 500)
}

function sendWhatsApp(b) {
  const message =
`🅿 *SpotFinder IOT — Parking Receipt*

📋 Bill No: #${b.bill_id}
📅 Date: ${new Date(b.created_at).toLocaleDateString('en-IN')}

👤 Name: ${b.user_name || '—'}
📱 Phone: ${b.phone || '—'}
🚗 Vehicle: ${b.vehicle_number || '—'}

🅿 Slot: ${b.slot_id}
⏱ Duration: ${fmtDuration(b.duration_minutes)}

💰 Amount: ₹${b.amount}
💳 Payment: ${b.payment_method || '—'}
✅ Status: Paid

Thank you for parking with us!
SpotFinder IOT 🚗`
  window.open(`https://wa.me/91${b.phone}?text=${encodeURIComponent(message)}`, '_blank')
}

function BillCenter() {
  const [bills, setBills]     = useState([])
  const [filters, setFilters] = useState({ date: '', type: '', status: '' })
  const [loading, setLoading] = useState(true)
  const [toast, setToast]     = useState('')
  const [modal, setModal]     = useState(null)

  const notify = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const load = async () => {
    setLoading(true)
    let q = supabase.from('bills').select('*').order('created_at', { ascending: false })
    if (filters.date)   q = q.gte('created_at', filters.date).lte('created_at', filters.date + 'T23:59:59')
    if (filters.type)   q = q.eq('type', filters.type)
    if (filters.status) q = q.eq('payment_status', filters.status)
    const { data } = await q
    if (data) setBills(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [filters])

  const today = new Date().toISOString().split('T')[0]
  const todayBills   = bills.filter(b => b.created_at?.startsWith(today))
  const todayAmount  = todayBills.reduce((s, b) => s + (b.amount || 0), 0)
  const walkinCount  = bills.filter(b => b.type === 'walkin').length
  const bookingCount = bills.filter(b => b.type === 'booked').length

  const exportExcel = () => {} // removed


  const summaryCards = [
    { label: 'Bills Today',    value: todayBills.length,  color: '#3498db' },
    { label: 'Revenue Today',  value: `₹${todayAmount}`,  color: '#2ecc71' },
    { label: 'Walk-in Bills',  value: walkinCount,         color: '#f39c12' },
    { label: 'Booking Bills',  value: bookingCount,        color: '#9b59b6' },
  ]

  return (
    <div className="bc-wrap">
      {toast && <div className="bc-toast">{toast}</div>}

      {/* Summary Cards */}
      <div className="bc-summary-grid">
        {summaryCards.map(c => (
          <div className="bc-summary-card" key={c.label} style={{ borderTopColor: c.color }}>
            <div className="bc-summary-value" style={{ color: c.color }}>{c.value}</div>
            <div className="bc-summary-label">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Filters + Export */}
      <div className="bc-filter-bar">
        <input type="date" className="bc-filter" value={filters.date}
          onChange={e => setFilters(p => ({ ...p, date: e.target.value }))} />
        <select className="bc-filter" value={filters.type}
          onChange={e => setFilters(p => ({ ...p, type: e.target.value }))}>
          <option value="">All Types</option>
          <option value="walkin">Walk-in</option>
          <option value="booked">App Booking</option>
        </select>
        <select className="bc-filter" value={filters.status}
          onChange={e => setFilters(p => ({ ...p, status: e.target.value }))}>
          <option value="">All Statuses</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
        </select>
        <button className="bc-reset" onClick={() => setFilters({ date: '', type: '', status: '' })}>Reset</button>
      </div>

      {/* Table */}
      <div className="bc-panel">
        <h3 className="bc-panel-title">All Bills ({bills.length})</h3>
        {loading ? (
          <div className="bc-empty">Loading...</div>
        ) : bills.length === 0 ? (
          <div className="bc-empty">No bills found.</div>
        ) : (
          <div className="bc-table-wrap">
            <table className="bc-table">
              <thead>
                <tr>
                  <th>Bill ID</th><th>Type</th><th>Customer</th><th>Phone</th>
                  <th>Slot</th><th>Duration</th><th>Amount</th>
                  <th>Method</th><th>Status</th><th>Date</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bills.map(b => (
                  <tr key={b.bill_id}>
                    <td>#{b.bill_id?.toString().slice(-6) || '—'}</td>
                    <td>
                      <span className={`bc-type-tag ${b.type}`}>
                        {b.type === 'walkin' ? 'Walk-in' : 'Booking'}
                      </span>
                    </td>
                    <td>{b.user_name || '—'}</td>
                    <td>{b.phone || '—'}</td>
                    <td><span className="bc-slot-tag">{b.slot_id}</span></td>
                    <td>{fmtDuration(b.duration_minutes)}</td>
                    <td className="bc-amount">₹{b.amount}</td>
                    <td>{b.payment_method || '—'}</td>
                    <td>
                      <span className={`bc-status-tag ${b.payment_status}`}>{b.payment_status}</span>
                    </td>
                    <td>{b.created_at ? new Date(b.created_at).toLocaleDateString('en-IN') : '—'}</td>
                    <td>
                      <div className="bc-actions">
                        <button className="bc-btn pdf" onClick={() => printBill(b)}>
                          <Printer size={12} />Print
                        </button>
                        {b.phone && (
                          <button className="bc-btn wa" onClick={() => sendWhatsApp(b)}>
                            <MessageCircle size={12} />WhatsApp
                          </button>
                        )}
                        <button className="bc-btn view" onClick={() => setModal(b)}><Eye size={12} />View</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {modal && (
        <div className="bc-modal-backdrop" onClick={() => setModal(null)}>
          <div className="bc-modal" onClick={e => e.stopPropagation()}>
            <h3>Bill #{modal.bill_id}</h3>
            <div className="bc-modal-grid">
              {[
                ['Type', modal.type], ['Customer', modal.user_name], ['Phone', modal.phone],
                ['Vehicle', modal.vehicle_number], ['Vehicle Type', modal.vehicle_type],
                ['Slot', modal.slot_id], ['Duration', fmtDuration(modal.duration_minutes)],
                ['Amount', `₹${modal.amount}`], ['Payment', modal.payment_method],
                ['Status', modal.payment_status],
                ['Entry', modal.entry_time ? new Date(modal.entry_time).toLocaleString('en-IN') : '—'],
                ['Exit', modal.exit_time ? new Date(modal.exit_time).toLocaleString('en-IN') : '—'],
              ].map(([k,v]) => (
                <div className="bc-modal-row" key={k}>
                  <span>{k}</span><strong>{v || '—'}</strong>
                </div>
              ))}
            </div>
            <div className="bc-modal-actions">
              <button className="bc-btn pdf" onClick={() => printBill(modal)}><Printer size={13} /> Print</button>
              {modal.phone && <button className="bc-btn wa" onClick={() => sendWhatsApp(modal)}><MessageCircle size={13} /> WhatsApp</button>}
              <button className="bc-modal-close" onClick={() => setModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default BillCenter
