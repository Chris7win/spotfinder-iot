import { useState, useEffect } from 'react'
import { supabase } from '../supabase/client'
import { useMqttSlots } from '../hooks/useMqttSlots'
import {
  Car, CheckCircle, Clock, TrendingUp,
  Zap, CircleDot, ArrowUpRight, ArrowDownRight,
  Server, Database, Cpu, Radio, LayoutGrid, IndianRupee,
} from 'lucide-react'
import './Overview.css'

const RUPEE = '\u20B9'
const HW_IDS = [1, 2, 3, 4]

function Overview() {
  const [slots,       setSlots]      = useState([])
  const [slotStatus,  setSlotStatus] = useState([])
  const [todayStats,  setToday]      = useState({ cars: 0, revenue: 0, active: 0, bills: 0 })
  const [recentLogs,  setLogs]       = useState([])
  const [loading,     setLoading]    = useState(true)

  const { connected, lastSeen } = useMqttSlots()

  useEffect(() => {
    const load = async () => {
      const { data: s } = await supabase.from('parking_slots').select('*').order('slot_id')
      if (s) setSlots(s)

      const { data: ss } = await supabase.from('slot_status').select('*').order('slot_num')
      if (ss) setSlotStatus(ss)

      const today = new Date().toISOString().split('T')[0]

      const { data: bills } = await supabase
        .from('bills')
        .select('amount, payment_status, created_at')
        .gte('created_at', today)
      const paidBills = bills?.filter(b => b.payment_status === 'paid') || []
      const revenue = paidBills.reduce((sum, b) => sum + (b.amount || 0), 0)

      const { data: active } = await supabase
        .from('walk_in_sessions')
        .select('session_id')
        .is('exit_time', null)

      const { data: logs } = await supabase
        .from('parking_logs')
        .select('log_id, slot_id, vehicle_number, entry_time, type')
        .gte('created_at', today)
        .order('entry_time', { ascending: false })
        .limit(6)
      if (logs) setLogs(logs)

      const { count: carCount } = await supabase
        .from('parking_logs')
        .select('log_id', { count: 'exact', head: true })
        .gte('date', today)

      setToday({
        cars: carCount || 0,
        revenue,
        active: active?.length || 0,
        bills: paidBills.length,
      })
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
      })
      .subscribe()

    return () => supabase.removeChannel(ch)
  }, [])

  const activeSlots = slots.filter(s => s.is_active)
  const available   = activeSlots.filter(s => !s.is_occupied && !s.is_booked).length
  const occupied    = activeSlots.filter(s => s.is_occupied).length
  const booked      = activeSlots.filter(s => s.is_booked && !s.is_occupied).length
  const activeCount = activeSlots.length
  const occupancyPct = activeCount > 0 ? Math.round((occupied / activeCount) * 100) : 0

  // Hardware heartbeat status
  const hwSlots = HW_IDS.map(id => {
    const ss = slotStatus.find(s => s.slot_num === id)
    const hb = ss?.last_heartbeat
    let status = 'offline', age = null
    if (hb) {
      age = Date.now() - new Date(hb).getTime()
      if (age < 5 * 60 * 1000) status = 'live'
      else if (age < 15 * 60 * 1000) status = 'stale'
    }
    return { id, status, time: hb ? new Date(hb).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : null }
  })
  const hwOnlineCount = hwSlots.filter(h => h.status === 'live').length

  // Connection health — show "Operational" if Supabase realtime is working (it always is since the page loaded)
  const mqttLabel = connected ? 'Connected' : (lastSeen ? 'Reconnecting' : 'Waiting')
  const mqttCls   = connected ? 'live' : 'stale'

  if (loading) return <div className="ov-loading"><div className="ov-spinner" /> Loading overview...</div>

  return (
    <div className="ov-wrap">

      {/* ── Hardware Slots ─────────────────────────────────── */}
      <section className="ov-section">
        <h2 className="ov-section-label"><Car size={14} /> Hardware Slots</h2>
      <div className="ov-card ov-slot-panel">
        <div className="ov-card-head">
          <Car size={16} />
          <h3>Hardware Slots</h3>
          <div className="ov-slot-summary">
            <span className="ov-sum-pill green">{available} Free</span>
            <span className="ov-sum-pill red">{occupied} Occupied</span>
            <span className="ov-sum-pill orange">{booked} Reserved</span>
          </div>
        </div>
        <div className="ov-slot-grid">
          {slots.filter(s => HW_IDS.includes(s.slot_id)).map(s => {
            const hw = hwSlots.find(h => h.id === s.slot_id)
            let statusLabel = 'Available', statusCls = 'avail'
            if (!s.is_active) { statusLabel = 'Inactive'; statusCls = 'off' }
            else if (s.is_occupied) { statusLabel = 'Occupied'; statusCls = 'occ' }
            else if (s.is_booked) { statusLabel = 'Reserved'; statusCls = 'res' }
            return (
              <div className={`ov-slot-tile ${statusCls}`} key={s.slot_id}>
                <div className="ov-tile-top">
                  <span className="ov-tile-id">Slot {s.slot_id}</span>
                  <span className={`ov-tile-hw ${hw?.status || 'offline'}`}>
                    <span className="ov-tile-hw-dot" />
                    {hw?.status === 'live' ? 'Online' : 'Offline'}
                  </span>
                </div>
                <span className={`ov-tile-status ${statusCls}`}>{statusLabel}</span>
                {s.location && <span className="ov-tile-loc">{s.location}</span>}
                {hw?.time && <span className="ov-tile-ts">Last seen {hw.time}</span>}
              </div>
            )
          })}
        </div>
      </div>
      </section>

      {/* ── Key Metrics ──────────────────────────────────────── */}
      <section className="ov-section">
        <h2 className="ov-section-label"><LayoutGrid size={14} /> Key Metrics</h2>
      <div className="ov-metrics">
        <div className="ov-metric-card">
          <div className="ov-metric-icon blue"><Car size={20} /></div>
          <div className="ov-metric-body">
            <span className="ov-metric-value">{activeCount}</span>
            <span className="ov-metric-label">Active Slots</span>
          </div>
          <span className="ov-metric-badge neutral">{activeCount}/20</span>
        </div>
        <div className="ov-metric-card">
          <div className="ov-metric-icon green"><CheckCircle size={20} /></div>
          <div className="ov-metric-body">
            <span className="ov-metric-value">{available}</span>
            <span className="ov-metric-label">Available</span>
          </div>
          {available > 0
            ? <span className="ov-metric-badge good"><ArrowUpRight size={12} /> Open</span>
            : <span className="ov-metric-badge bad">Full</span>
          }
        </div>
        <div className="ov-metric-card">
          <div className="ov-metric-icon red"><Zap size={20} /></div>
          <div className="ov-metric-body">
            <span className="ov-metric-value">{occupied}</span>
            <span className="ov-metric-label">Occupied</span>
          </div>
          <span className="ov-metric-badge neutral">{occupancyPct}%</span>
        </div>
        <div className="ov-metric-card">
          <div className="ov-metric-icon orange"><Clock size={20} /></div>
          <div className="ov-metric-body">
            <span className="ov-metric-value">{booked}</span>
            <span className="ov-metric-label">Reserved</span>
          </div>
        </div>
      </div>
      </section>

      {/* ── Today's Overview ─────────────────────────────────── */}
      <section className="ov-section">
        <h2 className="ov-section-label"><TrendingUp size={14} /> Today's Overview</h2>
      <div className="ov-duo">
        <div className="ov-card ov-today-card">
          <div className="ov-card-head">
            <TrendingUp size={16} />
            <h3>Today at a Glance</h3>
          </div>
          <div className="ov-revenue-grid">
            <div className="ov-rev-item">
              <span className="ov-rev-num"><IndianRupee size={13} style={{display:'inline',verticalAlign:'middle'}} />{todayStats.revenue}</span>
              <span className="ov-rev-label">Revenue</span>
            </div>
            <div className="ov-rev-item">
              <span className="ov-rev-num">{todayStats.cars}</span>
              <span className="ov-rev-label">Cars Parked</span>
            </div>
            <div className="ov-rev-item">
              <span className="ov-rev-num">{todayStats.active}</span>
              <span className="ov-rev-label">Active Sessions</span>
            </div>
            <div className="ov-rev-item">
              <span className="ov-rev-num">{todayStats.bills}</span>
              <span className="ov-rev-label">Bills Issued</span>
            </div>
          </div>
        </div>

        <div className="ov-card">
          <div className="ov-card-head">
            <CircleDot size={16} />
            <h3>Recent Activity</h3>
          </div>
          {recentLogs.length === 0 ? (
            <p className="ov-empty">No entries recorded today.</p>
          ) : (
            <div className="ov-activity-list">
              {recentLogs.map(l => (
                <div className="ov-activity-row" key={l.log_id}>
                  <span className="ov-act-slot">{l.slot_id}</span>
                  <div className="ov-act-info">
                    <span className="ov-act-vehicle">{l.vehicle_number || 'Unknown'}</span>
                    <span className="ov-act-type">{l.type === 'walkin' ? 'Walk-in' : 'Booking'}</span>
                  </div>
                  <span className="ov-act-time">
                    {l.entry_time ? new Date(l.entry_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      </section>

      {/* ── System Health ────────────────────────────────────── */}
      <section className="ov-section">
        <h2 className="ov-section-label"><Server size={14} /> System Health</h2>
      <div className="ov-card">
        <div className="ov-card-head">
          <Server size={16} />
          <h3>System Health</h3>
        </div>
        <div className="ov-health-grid">
          <div className="ov-health-item">
            <Radio size={15} />
            <span className="ov-health-name">MQTT Broker</span>
            <span className={`ov-health-dot ${mqttCls}`} />
            <span className={`ov-health-status ${mqttCls}`}>{mqttLabel}</span>
            {lastSeen && <span className="ov-health-ts">{lastSeen.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>}
          </div>
          <div className="ov-health-item">
            <Database size={15} />
            <span className="ov-health-name">Supabase Realtime</span>
            <span className="ov-health-dot live" />
            <span className="ov-health-status live">Connected</span>
          </div>
          <div className="ov-health-item">
            <Cpu size={15} />
            <span className="ov-health-name">Hardware Sensors</span>
            <span className={`ov-health-dot ${hwOnlineCount > 0 ? 'live' : 'offline'}`} />
            <span className={`ov-health-status ${hwOnlineCount > 0 ? 'live' : 'offline'}`}>
              {hwOnlineCount}/{HW_IDS.length} Online
            </span>
          </div>
        </div>
      </div>
      </section>

    </div>
  )
}

export default Overview
