import { useState, useEffect } from 'react'
import { supabase } from '../supabase/client'
import { useMqttSlots } from '../hooks/useMqttSlots'
import {
  Wifi, WifiOff, RefreshCw, CheckCircle, ToggleLeft, ToggleRight,
  Zap, ZapOff, Lock, Settings2, Radio, LayoutGrid,
} from 'lucide-react'
import './SlotMonitor.css'

const HW_IDS = [1, 2, 3, 4]

function hwHeartbeatStatus(hb) {
  if (!hb) return { label: 'No data', cls: 'sm-muted' }
  const age = Date.now() - new Date(hb).getTime()
  if (age < 5 * 60 * 1000)  return { label: 'Live',    cls: 'sm-green'  }
  if (age < 15 * 60 * 1000) return { label: 'Stale',   cls: 'sm-orange' }
  return                            { label: 'Offline', cls: 'sm-red'    }
}

function SlotMonitor() {
  const [slots,      setSlots]      = useState([])
  const [slotStatus, setSlotStatus] = useState([])
  const [toast,      setToast]      = useState('')
  const [saving,     setSaving]     = useState(null)
  const [view,       setView]       = useState('cards')

  const { mqttSlots, connected, lastSeen } = useMqttSlots()

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const loadSlots = async () => {
    const { data: ps } = await supabase.from('parking_slots').select('*').order('slot_id')
    if (ps) setSlots(ps)
    const { data: ss } = await supabase.from('slot_status').select('*').order('slot_num')
    if (ss) setSlotStatus(ss)
  }

  useEffect(() => {
    loadSlots()
    const ch = supabase
      .channel('slotmonitor-v2')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'parking_slots' }, payload => {
        setSlots(prev => {
          const updated = [...prev]
          const idx = updated.findIndex(s => s.slot_id === payload.new.slot_id)
          if (idx >= 0) updated[idx] = payload.new
          else updated.push(payload.new)
          return updated.sort((a, b) => a.slot_id - b.slot_id)
        })
      })
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [])

  const mergeSlot = (dbSlot) => {
    if (!HW_IDS.includes(dbSlot.slot_id)) return dbSlot
    const live = mqttSlots.find(m => m.slot_id === dbSlot.slot_id)
    if (!live) return dbSlot
    return { ...dbSlot, is_occupied: live.is_occupied }
  }

  const getStatus = (s) => {
    if (s.is_occupied) return 'occupied'
    if (s.is_booked)   return 'booked'
    return 'available'
  }

  const updateSlot = async (slotId, patch, label) => {
    setSaving(slotId)
    const { error } = await supabase
      .from('parking_slots')
      .update({ ...patch, last_updated: new Date().toISOString() })
      .eq('slot_id', slotId)
    setSaving(null)
    if (error) showToast(`Error: ${error.message}`)
    else { showToast(`Slot ${slotId} — ${label}`); loadSlots() }
  }

  const toggleActive = async (slot) => {
    const turnOn = !slot.is_active
    if (!turnOn && !window.confirm(`Deactivate Slot ${slot.slot_id}? It will be hidden from clients.`)) return
    await updateSlot(slot.slot_id, {
      is_active: turnOn, is_occupied: false, is_booked: false,
      vehicle_id: null, booked_by: null,
    }, turnOn ? 'Activated' : 'Deactivated')
  }

  const forceFree = (slot) => updateSlot(slot.slot_id, {
    is_occupied: false, is_booked: false, vehicle_id: null, booked_by: null,
  }, 'Forced Free')

  const forceOccupied = (slot) => updateSlot(slot.slot_id, { is_occupied: true }, 'Forced Occupied')

  const disableSlot = async (slot) => {
    if (!window.confirm(`Disable Slot ${slot.slot_id}? It will be hidden from clients.`)) return
    await updateSlot(slot.slot_id, {
      is_active: false, is_occupied: false, is_booked: false,
      vehicle_id: null, booked_by: null,
    }, 'Disabled')
  }

  const activeSlots   = slots.filter(s => s.is_active)
  const inactiveSlots = slots.filter(s => !s.is_active)

  const activateNext = async () => {
    if (activeSlots.length >= 20) return showToast('All 20 slots are already active.')
    const next = [...inactiveSlots].sort((a, b) => a.slot_id - b.slot_id)[0]
    if (!next) return
    await updateSlot(next.slot_id, {
      is_active: true, is_occupied: false, is_booked: false,
      vehicle_id: null, booked_by: null,
    }, 'Activated')
  }

  const deactivateHighest = async () => {
    if (activeSlots.length <= 1) return showToast('At least 1 slot must remain active.')
    const highest = [...activeSlots].sort((a, b) => b.slot_id - a.slot_id)[0]
    if (!highest) return
    if (!window.confirm(`Deactivate Slot ${highest.slot_id}?`)) return
    await updateSlot(highest.slot_id, {
      is_active: false, is_occupied: false, is_booked: false,
      vehicle_id: null, booked_by: null,
    }, 'Deactivated')
  }

  const statusLabel = { available: 'Available', occupied: 'Occupied', booked: 'Reserved' }
  const available = activeSlots.filter(s => !s.is_occupied && !s.is_booked).length
  const occupied  = activeSlots.filter(s => s.is_occupied).length
  const booked    = activeSlots.filter(s => s.is_booked && !s.is_occupied).length

  return (
    <div className="sm-wrap">
      {toast && <div className="sm-toast">{toast}</div>}

      {/* ── Connection Status ──────────────────────────────── */}
      <section className="sm-section">
        <h2 className="sm-section-label"><Radio size={14} /> Connection Status</h2>

      <div className={`sm-mqtt-bar ${connected ? 'online' : 'offline'}`}>
        {connected
          ? <><Wifi size={14} /> Live MQTT · Last: {lastSeen ? lastSeen.toLocaleTimeString('en-IN') : '—'}</>
          : <><WifiOff size={14} /> MQTT Disconnected — showing last known DB state</>
        }
      </div>

      <div className="sm-quick-stats">
        <div className="sm-qs-card available"><span className="sm-qs-num">{available}</span><span>Available</span></div>
        <div className="sm-qs-card occupied"><span className="sm-qs-num">{occupied}</span><span>Occupied</span></div>
        <div className="sm-qs-card booked"><span className="sm-qs-num">{booked}</span><span>Reserved</span></div>
        <div className="sm-qs-card total"><span className="sm-qs-num">{activeSlots.length}</span><span>Active</span></div>
      </div>
      </section>

      {/* ── Live Slot Status ──────────────────────────────── */}
      <section className="sm-section">
        <h2 className="sm-section-label"><LayoutGrid size={14} /> Live Slot Status</h2>

      <div className="sm-toolbar">
        <h3 className="sm-section-title">Live Slot Status</h3>
        <div className="sm-view-toggle">
          <button className={`sm-view-btn ${view === 'cards' ? 'active' : ''}`} onClick={() => setView('cards')}>Cards</button>
          <button className={`sm-view-btn ${view === 'table' ? 'active' : ''}`} onClick={() => setView('table')}>Table</button>
        </div>
        <button className="sm-refresh-btn" onClick={loadSlots}><RefreshCw size={14} /> Refresh</button>
      </div>

      {view === 'cards' && (
        <div className="sm-grid">
          {slots.map(dbSlot => {
            const isHW      = HW_IDS.includes(dbSlot.slot_id)
            const hwStat    = isHW ? slotStatus.find(s => s.slot_num === dbSlot.slot_id) : null
            const heartbeat = hwHeartbeatStatus(hwStat?.last_heartbeat)

            if (!dbSlot.is_active) {
              return (
                <div className="sm-card sm-card-inactive" key={dbSlot.slot_id}>
                  <div className="sm-header">
                    <span className="sm-slot-id">{dbSlot.slot_id}</span>
                    <span className="sm-badge-inactive">Inactive</span>
                  </div>
                  {dbSlot.location && <span className="sm-location">{dbSlot.location}</span>}
                  <div className="sm-actions">
                    <button className="sm-btn available" onClick={() => toggleActive(dbSlot)}>
                      <CheckCircle size={13} /> Activate
                    </button>
                  </div>
                </div>
              )
            }

            const slot   = mergeSlot(dbSlot)
            const status = getStatus(slot)
            return (
              <div className={`sm-card ${status}`} key={slot.slot_id}>
                <div className="sm-header">
                  <div className="sm-header-left">
                    <span className="sm-slot-id">{slot.slot_id}</span>
                    {isHW && <span className="sm-hw-tag">HW</span>}
                  </div>
                  <span className={`sm-dot ${status}`} />
                </div>
                {slot.location && <span className="sm-location">{slot.location}</span>}
                <span className={`sm-status-badge ${status}`}>{statusLabel[status]}</span>
                <div className="sm-details">
                  {isHW && (
                    <div className="sm-row">
                      <span>MQTT</span>
                      <span className={connected ? 'sm-green' : 'sm-muted'}>{connected ? 'Live' : 'No signal'}</span>
                    </div>
                  )}
                  <div className="sm-row">
                    <span>Sensor</span>
                    <span className={slot.is_occupied ? 'sm-red' : 'sm-green'}>{slot.is_occupied ? 'Occupied' : 'Clear'}</span>
                  </div>
                  <div className="sm-row">
                    <span>Booking</span>
                    <span className={slot.is_booked ? 'sm-orange' : 'sm-muted'}>{slot.is_booked ? 'Reserved' : 'None'}</span>
                  </div>
                  {slot.vehicle_id && <div className="sm-row"><span>Vehicle</span><span>{slot.vehicle_id}</span></div>}
                  {isHW && (
                    <div className="sm-row">
                      <span>Heartbeat</span>
                      <span className={heartbeat.cls}>{heartbeat.label}</span>
                    </div>
                  )}
                  <div className="sm-row">
                    <span>Updated</span>
                    <span className="sm-muted">{slot.last_updated ? new Date(slot.last_updated).toLocaleTimeString('en-IN') : '&mdash;'}</span>
                  </div>
                </div>
                <div className="sm-actions">
                  <button className="sm-btn available" onClick={() => forceFree(slot)}
                    disabled={saving === slot.slot_id || (!slot.is_occupied && !slot.is_booked)}>
                    <Zap size={13} /> Force Free
                  </button>
                  <button className="sm-btn disable" onClick={() => forceOccupied(slot)}
                    disabled={saving === slot.slot_id || slot.is_occupied}>
                    <ZapOff size={13} /> Force Occupied
                  </button>
                  <button className="sm-btn maintenance" onClick={() => disableSlot(slot)}
                    disabled={saving === slot.slot_id}>
                    <Lock size={13} /> Disable
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {view === 'table' && (
        <div className="sm-table-wrap">
          <table className="sm-table">
            <thead>
              <tr>
                <th>Slot</th><th>Type</th><th>Location</th><th>Active</th>
                <th>Occupied</th><th>Booked</th><th>Updated</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {slots.map(slot => {
                const isHW   = HW_IDS.includes(slot.slot_id)
                const merged = mergeSlot(slot)
                return (
                  <tr key={slot.slot_id} className={!slot.is_active ? 'sm-row-inactive' : ''}>
                    <td>
                      <div className="sm-cell-slot">
                        <span className="sm-slot-tag">{slot.slot_id}</span>
                        <span className={`sm-hw-badge ${isHW ? 'hw' : 'manual'}`}>{isHW ? 'HW' : 'Manual'}</span>
                      </div>
                    </td>
                    <td><span className={`sm-type-badge ${isHW ? 'hw' : 'manual'}`}>{isHW ? 'IR Sensor' : 'Expansion'}</span></td>
                    <td className="sm-loc-cell">{slot.location || '—'}</td>
                    <td>
                      <button className={`sm-toggle-btn ${slot.is_active ? 'on' : 'off'}`}
                        onClick={() => toggleActive(slot)} disabled={saving === slot.slot_id}>
                        {slot.is_active
                          ? <><ToggleRight size={18} /> ON</>
                          : <><ToggleLeft  size={18} /> OFF</>
                        }
                      </button>
                    </td>
                    <td><span className={`sm-bool ${merged.is_occupied ? 'yes' : 'no'}`}>{merged.is_occupied ? 'Yes' : 'No'}</span></td>
                    <td><span className={`sm-bool ${slot.is_booked ? 'yes' : 'no'}`}>{slot.is_booked ? 'Yes' : 'No'}</span></td>
                    <td className="sm-updated">
                      {slot.last_updated
                        ? new Date(slot.last_updated).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                        : '—'}
                    </td>
                    <td>
                      <div className="sm-tbl-actions">
                        <button className="sm-ta-btn free" onClick={() => forceFree(slot)}
                          disabled={saving === slot.slot_id || (!slot.is_occupied && !slot.is_booked)}>
                          <Zap size={11} /> Force Free
                        </button>
                        <button className="sm-ta-btn occupied" onClick={() => forceOccupied(slot)}
                          disabled={saving === slot.slot_id || slot.is_occupied}>
                          <ZapOff size={11} /> Force Occupied
                        </button>
                        {slot.is_active && (
                          <button className="sm-ta-btn disable" onClick={() => disableSlot(slot)}
                            disabled={saving === slot.slot_id}>
                            <Lock size={11} /> Disable
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      </section>

      {/* ── Slot Configuration ────────────────────────────── */}
      <section className="sm-section">
        <h2 className="sm-section-label"><Settings2 size={14} /> Slot Configuration</h2>

      <div className="sm-config-section">
        <div className="sm-config-header">
          <Settings2 size={16} />
          <h3>Slot Configuration</h3>
        </div>
        <div className="sm-counter-row">
          <button className="sm-counter-btn minus" onClick={deactivateHighest}
            disabled={saving !== null || activeSlots.length <= 1}>−</button>
          <div className="sm-counter-display">
            <span className="sm-counter-value">{activeSlots.length}</span>
            <span className="sm-counter-of">/ 20</span>
          </div>
          <button className="sm-counter-btn plus" onClick={activateNext}
            disabled={saving !== null || activeSlots.length >= 20}>+</button>
          <span className="sm-counter-label">{activeSlots.length} slot{activeSlots.length !== 1 ? 's' : ''} visible to clients and app</span>
        </div>
        <p className="sm-config-note">
          <strong>Note:</strong> Active slots reflect immediately on the client dashboard and Flutter app.
          Slots 1–4 are hardware-controlled (IR sensors) — override buttons are manual only.
        </p>
      </div>
      </section>
    </div>
  )
}

export default SlotMonitor
