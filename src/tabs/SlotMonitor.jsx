import { useState, useEffect } from 'react'
import { supabase } from '../supabase/client'
import { Wrench, RefreshCw, PowerOff } from 'lucide-react'
import './SlotMonitor.css'

function SlotMonitor() {
  const [slots, setSlots] = useState([])
  const [toast, setToast] = useState('')

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('parking_slots').select('*').order('slot_id')
      if (data) setSlots(data)
    }
    load()

    const ch = supabase
      .channel('slotmonitor')
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

  const updateSlot = async (slotId, patch, label) => {
    const { error } = await supabase
      .from('parking_slots')
      .update({ ...patch, last_updated: new Date().toISOString() })
      .eq('slot_id', slotId)
    if (error) showToast(`Error: ${error.message}`)
    else showToast(`${slotId} — ${label}`)
  }

  const getStatus = (s) => {
    if (s.is_occupied) return 'occupied'
    if (s.is_booked) return 'booked'
    return 'available'
  }

  const statusLabel = { available: 'Available', occupied: 'Occupied', booked: 'Reserved' }

  return (
    <div className="sm-wrap">
      {toast && <div className="sm-toast">{toast}</div>}
      <div className="sm-grid">
        {slots.map(slot => {
          const status = getStatus(slot)
          return (
            <div className={`sm-card ${status}`} key={slot.slot_id}>
              <div className="sm-header">
                <span className="sm-slot-id">{slot.slot_id}</span>
                <span className={`sm-dot ${status}`} />
              </div>
              <span className={`sm-status-badge ${status}`}>{statusLabel[status]}</span>

              <div className="sm-details">
                <div className="sm-row">
                  <span>Hardware (IR)</span>
                  <span className={slot.is_occupied ? 'sm-red' : 'sm-green'}>
                    {slot.is_occupied ? 'Occupied' : 'Clear'}
                  </span>
                </div>
                <div className="sm-row">
                  <span>App Booking</span>
                  <span className={slot.is_booked ? 'sm-orange' : 'sm-muted'}>
                    {slot.is_booked ? 'Reserved' : 'None'}
                  </span>
                </div>
                {slot.booked_by && (
                  <div className="sm-row">
                    <span>Booked By</span>
                    <span>{slot.booked_by}</span>
                  </div>
                )}
                {slot.vehicle_id && (
                  <div className="sm-row">
                    <span>Vehicle</span>
                    <span>{slot.vehicle_id}</span>
                  </div>
                )}
                <div className="sm-row">
                  <span>Last Updated</span>
                  <span className="sm-muted">
                    {slot.last_updated
                      ? new Date(slot.last_updated).toLocaleTimeString('en-IN')
                      : '—'}
                  </span>
                </div>
              </div>

              <div className="sm-actions">
                <button
                  className="sm-btn maintenance"
                  onClick={() => updateSlot(slot.slot_id, { is_occupied: false, is_booked: false, vehicle_id: null, booked_by: null }, 'Marked Maintenance')}
                >
                  <Wrench size={13} /> Maintenance
                </button>
                <button
                  className="sm-btn available"
                  onClick={() => updateSlot(slot.slot_id, { is_occupied: false, is_booked: false, vehicle_id: null, booked_by: null }, 'Forced Available')}
                >
                  <RefreshCw size={13} /> Force Available
                </button>
                <button
                  className="sm-btn disable"
                  onClick={() => updateSlot(slot.slot_id, { is_occupied: true }, 'Disabled')}
                >
                  <PowerOff size={13} /> Disable
                </button>
              </div>
            </div>
          )
        })}
      </div>
      {slots.length === 0 && <div className="sm-empty">Loading slots...</div>}
    </div>
  )
}

export default SlotMonitor
