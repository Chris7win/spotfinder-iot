import { useState, useEffect } from 'react'
import { supabase } from '../supabase/client'
import './DailyRecords.css'

function DailyRecords() {
  const [date, setDate]     = useState(new Date().toISOString().split('T')[0])
  const [logs, setLogs]     = useState([])
  const [bills, setBills]   = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data: l } = await supabase
        .from('parking_logs')
        .select('*')
        .gte('date', date)
        .lte('date', date)
        .order('entry_time')
      if (l) setLogs(l)

      const { data: b } = await supabase
        .from('bills')
        .select('*')
        .gte('created_at', date)
        .lte('created_at', date + 'T23:59:59')
        .eq('payment_status', 'paid')
      if (b) setBills(b)
      setLoading(false)
    }
    load()
  }, [date])

  const totalCars    = logs.length
  const totalBookings = logs.filter(l => l.type === 'booked').length
  const totalWalkins = logs.filter(l => l.type === 'walkin').length
  const totalRevenue = bills.reduce((s, b) => s + (b.amount || 0), 0)

  // Slot-wise breakdown
  const slots = ['A1','A2','A3','A4']
  const slotBreakdown = slots.map(sid => {
    const slotLogs = logs.filter(l => l.slot_id === sid)
    const totalHours = slotLogs.reduce((s, l) => s + ((l.duration_minutes || 0) / 60), 0)
    const slotBills = bills.filter(b => b.slot_id === sid)
    const slotRev   = slotBills.reduce((s, b) => s + (b.amount || 0), 0)
    return { slot: sid, sessions: slotLogs.length, hours: totalHours.toFixed(1), revenue: slotRev }
  })

  return (
    <div className="dr-wrap">
      <div className="dr-date-bar">
        <label className="dr-date-label">Select Date</label>
        <input
          type="date"
          className="dr-date-input"
          value={date}
          max={new Date().toISOString().split('T')[0]}
          onChange={e => setDate(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="dr-loading">Loading records for {date}...</div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="dr-summary-grid">
            {[
              { label: 'Total Cars',  value: totalCars,         color: '#3498db' },
              { label: 'Bookings',    value: totalBookings,      color: '#9b59b6' },
              { label: 'Walk-ins',    value: totalWalkins,       color: '#f39c12' },
              { label: 'Revenue',     value: `₹${totalRevenue}`, color: '#2ecc71' },
            ].map(c => (
              <div className="dr-summary-card" key={c.label} style={{ borderTopColor: c.color }}>
                <div className="dr-summary-value" style={{ color: c.color }}>{c.value}</div>
                <div className="dr-summary-label">{c.label}</div>
              </div>
            ))}
          </div>

          {/* Slot Breakdown */}
          <div className="dr-panel">
            <h3 className="dr-panel-title">Slot-wise Breakdown</h3>
            <table className="dr-table">
              <thead>
                <tr><th>Slot</th><th>Sessions</th><th>Total Hours</th><th>Revenue</th></tr>
              </thead>
              <tbody>
                {slotBreakdown.map(s => (
                  <tr key={s.slot}>
                    <td><span className="dr-slot-tag">{s.slot}</span></td>
                    <td>{s.sessions}</td>
                    <td>{s.hours} hrs</td>
                    <td className="dr-rev">₹{s.revenue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Full Log */}
          <div className="dr-panel">
            <h3 className="dr-panel-title">Full Activity Log ({logs.length})</h3>
            {logs.length === 0 ? (
              <div className="dr-empty">No records for {date}.</div>
            ) : (
              <div className="dr-table-wrap">
                <table className="dr-table dr-log-table">
                  <thead>
                    <tr><th>Slot</th><th>Vehicle</th><th>Type</th><th>Entry</th><th>Exit</th><th>Duration</th></tr>
                  </thead>
                  <tbody>
                    {logs.map(l => {
                      const dur = l.duration_minutes
                        ? `${Math.floor(l.duration_minutes/60)}h ${Math.round(l.duration_minutes%60)}m`
                        : '—'
                      return (
                        <tr key={l.log_id}>
                          <td><span className="dr-slot-tag">{l.slot_id}</span></td>
                          <td>{l.vehicle_number || '—'}</td>
                          <td><span className={`dr-type-tag ${l.type}`}>{l.type}</span></td>
                          <td>{l.entry_time ? new Date(l.entry_time).toLocaleTimeString('en-IN') : '—'}</td>
                          <td>{l.exit_time  ? new Date(l.exit_time).toLocaleTimeString('en-IN')  : 'Active'}</td>
                          <td>{dur}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default DailyRecords
