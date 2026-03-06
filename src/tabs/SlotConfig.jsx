import { useState, useEffect } from 'react'
import { supabase } from '../supabase/client'
import { ToggleLeft, ToggleRight, Zap, ZapOff, Lock } from 'lucide-react'
import './SlotConfig.css'

function SlotConfig() {
  const [slots, setSlots]     = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast]     = useState({ msg: '', type: 'ok' })
  const [saving, setSaving]   = useState(null) // slot_id being saved

  const notify = (msg, type = 'ok') => {
    setToast({ msg, type })
    setTimeout(() => setToast({ msg: '', type: 'ok' }), 3500)
  }

  const loadSlots = async () => {
    const { data, error } = await supabase
      .from('parking_slots')
      .select('*')
      .order('slot_id')
    if (error) { notify('Failed to load slots: ' + error.message, 'err'); setLoading(false); return }
    if (data) setSlots(data)
    setLoading(false)
  }

  useEffect(() => {
    ;(async () => { await loadSlots() })()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const activeSlots   = slots.filter(s => s.is_active)
  const activeCount   = activeSlots.length
  const inactiveSlots = slots.filter(s => !s.is_active)

  // ── Counter: activate next inactive slot ──────────────────────────────
  const activateNext = async () => {
    if (activeCount >= 20) return notify('All 20 slots are already active.', 'err')
    const next = inactiveSlots.sort((a, b) => a.slot_id - b.slot_id)[0]
    if (!next) return
    setSaving('counter')
    const { error } = await supabase
      .from('parking_slots')
      .update({
        is_active: true,
        is_occupied: false,
        is_booked: false,
        vehicle_id: null,
        booked_by: null,
        last_updated: new Date().toISOString(),
      })
      .eq('slot_id', next.slot_id)
    setSaving(null)
    if (error) notify('Failed to activate slot: ' + error.message, 'err')
    else { notify(`Slot ${next.slot_id} activated.`) ; await loadSlots() }
  }

  // ── Counter: deactivate highest active slot ───────────────────────────
  const deactivateHighest = async () => {
    if (activeCount <= 1) return notify('At least 1 slot must remain active.', 'err')
    const highest = activeSlots.sort((a, b) => b.slot_id - a.slot_id)[0]
    if (!highest) return
    const confirmed = window.confirm(
      `Deactivating Slot ${highest.slot_id} will hide it from clients and the app. Confirm?`
    )
    if (!confirmed) return
    setSaving('counter')
    const { error } = await supabase
      .from('parking_slots')
      .update({
        is_active: false,
        is_occupied: false,
        is_booked: false,
        vehicle_id: null,
        booked_by: null,
        last_updated: new Date().toISOString(),
      })
      .eq('slot_id', highest.slot_id)
    setSaving(null)
    if (error) notify('Failed to deactivate slot: ' + error.message, 'err')
    else { notify(`Slot ${highest.slot_id} deactivated.`) ; await loadSlots() }
  }

  // ── Row-level active toggle ───────────────────────────────────────────
  const toggleActive = async (slot) => {
    const turnOn = !slot.is_active
    if (!turnOn) {
      const confirmed = window.confirm(
        `Deactivating Slot ${slot.slot_id} will hide it from clients and the app. Confirm?`
      )
      if (!confirmed) return
    }
    setSaving(slot.slot_id)
    const { error } = await supabase
      .from('parking_slots')
      .update({
        is_active: turnOn,
        is_occupied: false,
        is_booked: false,
        vehicle_id: null,
        booked_by: null,
        last_updated: new Date().toISOString(),
      })
      .eq('slot_id', slot.slot_id)
    setSaving(null)
    if (error) notify('Toggle failed: ' + error.message, 'err')
    else { notify(`Slot ${slot.slot_id} ${turnOn ? 'activated' : 'deactivated'}.`) ; await loadSlots() }
  }

  // ── Force Free ────────────────────────────────────────────────────────
  const forceFree = async (slot) => {
    setSaving(slot.slot_id)
    const { error } = await supabase
      .from('parking_slots')
      .update({
        is_occupied: false,
        is_booked: false,
        vehicle_id: null,
        booked_by: null,
        last_updated: new Date().toISOString(),
      })
      .eq('slot_id', slot.slot_id)
    setSaving(null)
    if (error) notify('Force free failed: ' + error.message, 'err')
    else { notify(`Slot ${slot.slot_id} forced free.`) ; await loadSlots() }
  }

  // ── Force Occupied ────────────────────────────────────────────────────
  const forceOccupied = async (slot) => {
    setSaving(slot.slot_id)
    const { error } = await supabase
      .from('parking_slots')
      .update({
        is_occupied: true,
        last_updated: new Date().toISOString(),
      })
      .eq('slot_id', slot.slot_id)
    setSaving(null)
    if (error) notify('Force occupied failed: ' + error.message, 'err')
    else { notify(`Slot ${slot.slot_id} forced occupied.`) ; await loadSlots() }
  }

  // ── Disable (set is_active=false) ────────────────────────────────────
  const disableSlot = async (slot) => {
    const confirmed = window.confirm(
      `Deactivating Slot ${slot.slot_id} will hide it from clients and the app. Confirm?`
    )
    if (!confirmed) return
    setSaving(slot.slot_id)
    const { error } = await supabase
      .from('parking_slots')
      .update({
        is_active: false,
        is_occupied: false,
        is_booked: false,
        vehicle_id: null,
        booked_by: null,
        last_updated: new Date().toISOString(),
      })
      .eq('slot_id', slot.slot_id)
    setSaving(null)
    if (error) notify('Disable failed: ' + error.message, 'err')
    else { notify(`Slot ${slot.slot_id} disabled.`) ; await loadSlots() }
  }

  if (loading) return <div className="sc-loading">Loading slot configuration...</div>

  return (
    <div className="sc-wrap">
      {toast.msg && <div className={`sc-toast ${toast.type}`}>{toast.msg}</div>}

      {/* ── Active Slot Counter ─────────────────────────────────────── */}
      <div className="sc-counter-panel">
        <h3 className="sc-panel-title">Active Slot Count</h3>
        <div className="sc-counter-row">
          <button
            className="sc-counter-btn minus"
            onClick={deactivateHighest}
            disabled={saving === 'counter' || activeCount <= 1}
          >
            −
          </button>
          <div className="sc-counter-display">
            <span className="sc-counter-value">{activeCount}</span>
            <span className="sc-counter-of">/ 20</span>
          </div>
          <button
            className="sc-counter-btn plus"
            onClick={activateNext}
            disabled={saving === 'counter' || activeCount >= 20}
          >
            +
          </button>
        </div>
        <p className="sc-counter-sub">
          {activeCount} slot{activeCount !== 1 ? 's' : ''} currently visible to clients and the Flutter app
        </p>
      </div>

      {/* ── Info Note ──────────────────────────────────────────────── */}
      <div className="sc-info-note">
        <strong>Note:</strong> Active slots are immediately reflected on the client dashboard and Flutter app via Supabase.
        Slots 1–4 are hardware-controlled via IR sensors — forcing occupied/free here is for manual override only.
      </div>

      {/* ── Slot Table ─────────────────────────────────────────────── */}
      <div className="sc-panel">
        <h3 className="sc-panel-title">All Slots (1–20)</h3>
        <div className="sc-table-wrap">
          <table className="sc-table">
            <thead>
              <tr>
                <th>Slot ID</th>
                <th>Type</th>
                <th>Location</th>
                <th>Active</th>
                <th>Occupied</th>
                <th>Booked</th>
                <th>Last Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {slots.map(slot => {
                const isHW    = slot.slot_id <= 4
                const isBusy  = saving === slot.slot_id
                return (
                  <tr key={slot.slot_id} className={!slot.is_active ? 'sc-row-inactive' : ''}>
                    <td>
                      <div className="sc-slot-id-cell">
                        <span className="sc-slot-tag">{slot.slot_id}</span>
                        <span className={`sc-hw-badge ${isHW ? 'hw' : 'manual'}`}>
                          {isHW ? 'HW' : 'Manual'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={`sc-type-badge ${isHW ? 'hw' : 'manual'}`}>
                        {isHW ? 'IR Sensor' : 'Expansion'}
                      </span>
                    </td>
                    <td>
                      <span className="sc-location">{slot.location || '—'}</span>
                    </td>
                    <td>
                      <button
                        className={`sc-toggle ${slot.is_active ? 'on' : 'off'}`}
                        onClick={() => toggleActive(slot)}
                        disabled={isBusy}
                        title={slot.is_active ? 'Click to deactivate' : 'Click to activate'}
                      >
                        {slot.is_active
                          ? <><ToggleRight size={20} /> ON</>
                          : <><ToggleLeft  size={20} /> OFF</>
                        }
                      </button>
                    </td>
                    <td>
                      <span className={`sc-bool ${slot.is_occupied ? 'yes' : 'no'}`}>
                        {slot.is_occupied ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td>
                      <span className={`sc-bool ${slot.is_booked ? 'yes' : 'no'}`}>
                        {slot.is_booked ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="sc-updated">
                      {slot.last_updated
                        ? new Date(slot.last_updated).toLocaleString('en-IN', {
                            day: '2-digit', month: 'short',
                            hour: '2-digit', minute: '2-digit',
                          })
                        : '—'}
                    </td>
                    <td>
                      <div className="sc-actions">
                        <button
                          className="sc-btn free"
                          onClick={() => forceFree(slot)}
                          disabled={isBusy || (!slot.is_occupied && !slot.is_booked)}
                          title="Clear occupied/booked flags"
                        >
                          <Zap size={12} /> Force Free
                        </button>
                        <button
                          className="sc-btn occupied"
                          onClick={() => forceOccupied(slot)}
                          disabled={isBusy || slot.is_occupied}
                          title="Mark as occupied (manual override)"
                        >
                          <ZapOff size={12} /> Force Occupied
                        </button>
                        {slot.is_active && (
                          <button
                            className="sc-btn disable"
                            onClick={() => disableSlot(slot)}
                            disabled={isBusy}
                            title="Deactivate this slot"
                          >
                            <Lock size={12} /> Disable
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
      </div>
    </div>
  )
}

export default SlotConfig
