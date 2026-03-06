import { useState, useEffect } from 'react'
import { supabase } from '../supabase/client'
import { useMqttSlots } from '../hooks/useMqttSlots'
import { Activity, Car, CheckCircle, Clock, TrendingUp, Wifi, WifiOff } from 'lucide-react'
import './Overview.css'

const HW_IDS = [1, 2, 3, 4]

function hwHeartbeatStatus(hb) {
  if (!hb) return { label: 'No data', cls: 'ov-muted' }
  const age = Date.now() - new Date(hb).getTime()
  if (age < 5 * 60 * 1000)  return { label: 'Live',    cls: 'ov-hw-live'   }
  if (age < 15 * 60 * 1000) return { label: 'Stale',   cls: 'ov-hw-stale'  }
  return                            { label: 'Offline', cls: 'ov-hw-offline' }
}

function Overview() {
  const [slots,       setSlots]     = useState([])
  const [slotStatus,  setSlotStatus] = useState([])
  const [todayStats,  setToday]     = useState({ cars: 0, revenue: 0, active: 0 })
  const [recentLogs,  setLogs]      = useState([])
  const [loading,     setLoading]   = useState(true)
  const [lastPing,    setLastPing]  = useState(null)

  const { connected, lastSeen } = useMqttSlots()

  useEffect(() => {
    const load = async () => {
      const { data: s } = await supabase.from('parking_slots').select('*').order('slot_id')
      if (s) setSlots(s)

      const { data: ss } = await supabase.from('slot_status').select('*').order('slot_num')
      if (ss) setSlotStatus(ss)

      const today = new Date().toISOString().split('T')[0]

      // Today's revenue from bills
      const { data: bills } = await supabase
        .from('bills')
        .select('amount, payment_status, created_at')
        .gte('created_at', today)
      const revenue = bills?.filter(b => b.payment_status === 'paid').reduce((sum, b) => sum + (b.amount || 0), 0) || 0

      // Active walk-in sessions
      const { data: active } = await supabase
        .from('walk_in_sessions')
        .select('session_id')
        .is('exit_time', null)
      const activeCnt = active?.length || 0

      // Cars today from parking_logs
      const { data: logs } = await supabase
        .from('parking_logs')
        .select('log_id, slot_id, vehicle_number, entry_time, type')
        .gte('created_at', today)
        .order('entry_time', { ascending: false })
        .limit(5)
      if (logs) setLogs(logs)

      // Total cars today (distinct entries)
      const { count: carCount } = await supabase
        .from('parking_logs')
        .select('log_id', { count: 'exact', head: true })
        .gte('date', today)

      // Last updated slot as proxy for DB ping
      const latestSlot = s?.sort((a, b) => new Date(b.last_updated) - new Date(a.last_updated))[0]
      if (latestSlot?.last_updated) setLastPing(new Date(latestSlot.last_updated))

      setToday({ cars: carCount || 0, revenue, active: activeCnt })
      setLoading(false)
    }
    load()

    const ch = supabase
      .channel('overview-slots')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'parking_slots' }, payload => {
        setSlots(prev => {
          const updated = [...prev]
          const idx = updated.findIndex(s => s.slot_id === payload.new.slot_id)
          if (idx >= 0) updated[idx] = payload.new
          else updated.push(payload.new)
          return updated
        })
        setLastPing(new Date())
      })
      .subscribe()

    return () => supabase.removeChannel(ch)
  }, [])

  const activeSlots = slots.filter(s => s.is_active)
  const available   = activeSlots.filter(s => !s.is_occupied && !s.is_booked).length
  const occupied    = activeSlots.filter(s => s.is_occupied).length
  const booked      = activeSlots.filter(s => s.is_booked && !s.is_occupied).length
  const activeCount = activeSlots.length

  const hwOnline = lastPing && (Date.now() - lastPing.getTime()) < 5 * 60 * 1000

  const statCards = [
    { label: 'Active Slots', value: activeCount, sub: 'of 20 configured', color: '#3498db', icon: <Car size={20} /> },
    { label: 'Available',    value: available,  sub: null, color: '#2ecc71', icon: <CheckCircle size={20} /> },
    { label: 'Occupied',     value: occupied,   sub: null, color: '#e74c3c', icon: <Activity size={20} /> },
    { label: 'Reserved',     value: booked,     sub: null, color: '#f39c12', icon: <Clock size={20} /> },
  ]

  return (
    <div className="overview">
      {loading && <div className="ov-loading">Loading overview...</div>}

      {/* Stat Cards */}
      <div className="ov-stats-grid">
        {statCards.map(c => (
          <div className="ov-stat-card" key={c.label} style={{ borderTopColor: c.color }}>
            <div className="ov-stat-icon" style={{ color: c.color }}>{c.icon}</div>
            <div className="ov-stat-value" style={{ color: c.color }}>{c.value}</div>
            <div className="ov-stat-label">{c.label}</div>
            {c.sub && <div className="ov-stat-sub">{c.sub}</div>}
          </div>
        ))}
      </div>

      <div className="ov-row">
        {/* System Status */}
        <div className="ov-card">
          <h3 className="ov-card-title">
            {connected ? <Wifi size={16} color="#2ecc71" /> : <WifiOff size={16} color="#e74c3c" />}
            System Status
          </h3>
          <div className="ov-status-row">
            <span>MQTT Broker</span>
            <span className={`ov-badge ${connected ? 'online' : 'offline'}`}>
              {connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <div className="ov-status-row">
            <span>MQTT Last Message</span>
            <span className="ov-muted">{lastSeen ? lastSeen.toLocaleTimeString('en-IN') : '—'}</span>
          </div>
          <div className="ov-status-row">
            <span>Supabase Realtime</span>
            <span className="ov-badge online">Connected</span>
          </div>
          <div className="ov-status-row">
            <span>DB Last Update</span>
            <span className={`ov-badge ${hwOnline ? 'online' : 'offline'}`}>
              {hwOnline ? 'Recent' : 'Stale'}
            </span>
          </div>

          {/* Hardware heartbeat per slot */}
          <div className="ov-hw-section">
            <div className="ov-hw-title">Hardware Slots Heartbeat</div>
            {HW_IDS.map(id => {
              const ss  = slotStatus.find(s => s.slot_num === id)
              const hb  = hwHeartbeatStatus(ss?.last_heartbeat)
              return (
                <div className="ov-status-row" key={id}>
                  <span>Slot {id}</span>
                  <div className="ov-hw-right">
                    <span className={`ov-hw-label ${hb.cls}`}>{hb.label}</span>
                    {ss?.last_heartbeat && (
                      <span className="ov-muted">
                        {new Date(ss.last_heartbeat).toLocaleTimeString('en-IN')}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Today's Summary */}
        <div className="ov-card">
          <h3 className="ov-card-title"><TrendingUp size={16} color="#3498db" /> Today's Summary</h3>
          <div className="ov-status-row">
            <span>Total Cars Parked</span>
            <strong>{todayStats.cars}</strong>
          </div>
          <div className="ov-status-row">
            <span>Revenue</span>
            <strong>₹{todayStats.revenue}</strong>
          </div>
          <div className="ov-status-row">
            <span>Active Sessions</span>
            <strong>{todayStats.active}</strong>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="ov-card">
        <h3 className="ov-card-title"><Activity size={16} color="#9b59b6" /> Recent Activity</h3>
        {recentLogs.length === 0 ? (
          <p className="ov-empty">No activity yet today.</p>
        ) : (
          <table className="ov-table">
            <thead>
              <tr><th>Slot</th><th>Vehicle</th><th>Type</th><th>Entry</th></tr>
            </thead>
            <tbody>
              {recentLogs.map(l => (
                <tr key={l.log_id}>
                  <td><span className="ov-slot-tag">{l.slot_id}</span></td>
                  <td>{l.vehicle_number || '—'}</td>
                  <td><span className="ov-type-tag">{l.type}</span></td>
                  <td>{l.entry_time ? new Date(l.entry_time).toLocaleTimeString('en-IN') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default Overview
