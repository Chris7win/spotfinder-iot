import { useState, useEffect } from 'react'
import { supabase } from '../supabase/client'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  Legend, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import './Analytics.css'

function getLast7Days() {
  const days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0,0,0,0)
    days.push(d.toISOString().split('T')[0])
  }
  return days
}

function Analytics() {
  const [logs, setLogs]     = useState([])
  const [bills, setBills]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const today = new Date().toISOString().split('T')[0]
      const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0)

      const { data: l } = await supabase
        .from('parking_logs')
        .select('*')
        .gte('created_at', monthStart.toISOString())
        .order('entry_time')
      if (l) setLogs(l)

      const { data: b } = await supabase
        .from('bills')
        .select('amount, created_at')
        .gte('created_at', monthStart.toISOString())
        .eq('payment_status', 'paid')
      if (b) setBills(b)

      setLoading(false)
    }
    load()
  }, [])

  const today = new Date().toISOString().split('T')[0]
  const todayLogs = logs.filter(l => l.entry_time?.startsWith(today))

  // Hourly chart — today
  const hourlyData = Array.from({ length: 24 }, (_, h) => ({
    hour: `${h.toString().padStart(2,'0')}:00`,
    cars: todayLogs.filter(l => {
      const lh = l.entry_time ? new Date(l.entry_time).getHours() : -1
      return lh === h
    }).length,
  })).filter(h => h.cars > 0 || (new Date().getHours() === parseInt(h.hour)))

  // Daily trend — last 7 days
  const days = getLast7Days()
  const dailyData = days.map(date => ({
    day: date.slice(5),
    cars: logs.filter(l => l.entry_time?.startsWith(date)).length,
  }))

  // Monthly revenue trend
  const monthlyRevData = days.map(date => ({
    day: date.slice(5),
    revenue: bills.filter(b => b.created_at?.startsWith(date)).reduce((s, b) => s + (b.amount || 0), 0),
  }))

  // Stats
  const peakHour = hourlyData.reduce((max, h) => h.cars > (max?.cars || 0) ? h : max, null)
  const slotCount = {}
  logs.forEach(l => { if (l.slot_id) slotCount[l.slot_id] = (slotCount[l.slot_id] || 0) + 1 })
  const mostUsedSlot = Object.entries(slotCount).sort((a,b) => b[1]-a[1])[0]
  const totalCarsMonth = logs.length

  const statCards = [
    { label: 'Peak Hour Today', value: peakHour ? peakHour.hour : '—', sub: peakHour ? `${peakHour.cars} cars` : 'No data' },
    { label: 'Most Used Slot',  value: mostUsedSlot ? mostUsedSlot[0] : '—', sub: mostUsedSlot ? `${mostUsedSlot[1]} sessions` : 'No data' },
    { label: 'Total Cars / Month', value: totalCarsMonth, sub: 'this month' },
  ]

  if (loading) return <div className="an-loading">Loading analytics...</div>

  return (
    <div className="an-wrap">
      {/* Stats */}
      <div className="an-stats-grid">
        {statCards.map(c => (
          <div className="an-stat-card" key={c.label}>
            <div className="an-stat-value">{c.value}</div>
            <div className="an-stat-label">{c.label}</div>
            <div className="an-stat-sub">{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Hourly Bar - today */}
      <div className="an-chart-panel">
        <h3 className="an-chart-title">Hourly Occupancy — Today</h3>
        {hourlyData.length === 0 ? (
          <div className="an-empty">No parking logs for today yet.</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={hourlyData} margin={{ top: 8, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="cars" name="Cars" fill="#3498db" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Daily Trend Line */}
      <div className="an-chart-panel">
        <h3 className="an-chart-title">Daily Cars — Last 7 Days</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={dailyData} margin={{ top: 8, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="day" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line type="monotone" dataKey="cars" name="Cars Parked" stroke="#2ecc71" strokeWidth={2.5} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Monthly Revenue Trend */}
      <div className="an-chart-panel">
        <h3 className="an-chart-title">Revenue Trend — Last 7 Days (₹)</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={monthlyRevData} margin={{ top: 8, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="day" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => `₹${v}`} />
            <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#9b59b6" strokeWidth={2.5} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default Analytics
