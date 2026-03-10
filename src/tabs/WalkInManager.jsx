import { useState, useEffect } from 'react'
import { supabase } from '../supabase/client'
import { jsPDF } from 'jspdf'
import { UserPlus, MessageCircle, Printer, StopCircle, ClipboardList, IndianRupee } from 'lucide-react'
import './WalkInManager.css'

const RUPEE = '\u20B9'

// ─── PDF Generator ─────────────────────────────────────────────────────────
function generateBillPDF(bill) {
  const doc = new jsPDF({ unit: 'mm', format: [80, 150] })
  const x = 5; let y = 8
  const line = (txt, size = 8, bold = false) => {
    doc.setFontSize(size)
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.text(txt, x, y)
    y += size * 0.5
  }
  const divider = () => { doc.setDrawColor(200); doc.line(x, y, 75, y); y += 4 }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('SPOTFINDER IOT', 40, y, { align: 'center' }); y += 6
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('Parking Receipt', 40, y, { align: 'center' }); y += 5
  divider()
  line(`Bill No:        #${bill.bill_id || 'B---'}`, 8)
  line(`Date:           ${bill.date}`, 8)
  line(`Entry Time:     ${bill.entry_time}`, 8)
  line(`Exit Time:      ${bill.exit_time}`, 8)
  divider()
  line(`Customer:       ${bill.user_name}`, 8)
  line(`Phone:          ${bill.phone}`, 8)
  line(`Vehicle No:     ${bill.vehicle_number}`, 8)
  line(`Vehicle Type:   ${bill.vehicle_type}`, 8)
  divider()
  line(`Slot:           ${bill.slot_id}`, 8)
  line(`Duration:       ${bill.duration}`, 8)
  divider()
  line(`Total Amount:   Rs.${bill.amount}`, 9, true)
  line(`Payment:        ${bill.payment_method}`, 8)
  line(`Status:         PAID`, 8, true)
  divider()
  doc.setFontSize(7)
  doc.text('Thank you for using SpotFinder!', 40, y, { align: 'center' })
  return doc
}

// ─── WhatsApp Sender ────────────────────────────────────────────────────────
function sendWhatsApp(bill) {
  const message =
`🅿 *SpotFinder IOT — Parking Receipt*

📋 Bill No: #${bill.bill_id || 'DRAFT'}
📅 Date: ${bill.date}

👤 Name: ${bill.user_name}
📱 Phone: ${bill.phone}
🚗 Vehicle: ${bill.vehicle_number}
🚙 Type: ${bill.vehicle_type}

🅿 Slot: ${bill.slot_id}
⏱ Duration: ${bill.duration}
🕐 Entry: ${bill.entry_time}
🕑 Exit: ${bill.exit_time}

💰 Amount: ${RUPEE}${bill.amount}
💳 Payment: ${bill.payment_method}
✅ Status: Paid

Thank you for parking with us!
SpotFinder IOT 🚗`
  const url = `https://wa.me/91${bill.phone}?text=${encodeURIComponent(message)}`
  window.open(url, '_blank')
}

// ─── Duration formatter ─────────────────────────────────────────────────────
function fmtDuration(minutes) {
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  if (h === 0) return `${m} min`
  if (m === 0) return `${h} hr`
  return `${h} hr ${m} min`
}

function fmtTimer(seconds) {
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0')
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${h}:${m}:${s}`
}

// ─── Live Session Row ───────────────────────────────────────────────────────
function SessionRow({ session, pricing, onEnd, onBill, onPrint, onWA }) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const start = new Date(session.entry_time).getTime()
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [session.entry_time])

  const elapsedMin = elapsed / 60
  // open session: duration_minutes is null (no fixed duration was set)
  // Treat session as open if no amount was pre-set (open/unknown duration)
  const isOpen = !session.amount || session.amount === 0
  const hourlyRate = pricing.find(p => p.duration_label === '1 Hour')?.price || 25
  let amount = isOpen
    ? Math.ceil(Math.max(elapsedMin, 1) / 60) * hourlyRate
    : session.amount

  return (
    <tr>
      <td><span className="wi-slot-tag">{session.slot_id}</span></td>
      <td>{session.user_name}</td>
      <td>{session.vehicle_number}</td>
      <td>{session.vehicle_type}</td>
      <td>{new Date(session.entry_time).toLocaleTimeString('en-IN')}</td>
      <td className="wi-timer">{fmtTimer(elapsed)}</td>
      <td>{isOpen ? 'Open (live)' : fmtDuration(elapsed)}</td>
      <td className="wi-amount"><IndianRupee size={13} style={{display:'inline',verticalAlign:'middle'}} />{amount}</td>
      <td>{session.payment_method}</td>
      <td>
        <div className="wi-actions">
          <button className="wi-btn end"   onClick={() => onEnd(session, amount)}><StopCircle size={13} />End</button>
          <button className="wi-btn bill"  onClick={() => onBill(session, amount)}><Printer size={13} />Bill</button>
          <button className="wi-btn print" onClick={() => onPrint(session, amount)}><Printer size={13} />PDF</button>
          <button className="wi-btn wa"    onClick={() => onWA(session, amount)}><MessageCircle size={13} />WA</button>
        </div>
      </td>
    </tr>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────
const INITIAL_FORM = {
  user_name: '', phone: '', vehicle_number: '', vehicle_type: 'Car',
  slot_id: '', payment_method: 'Cash', duration_type: 'known', duration_label: '1 Hour',
}

function WalkInManager() {
  const [form, setForm]         = useState(INITIAL_FORM)
  const [sessions, setSessions] = useState([])
  const [avSlots, setAvSlots]   = useState([])
  const [pricing, setPricing]   = useState([])
  const [toast, setToast]       = useState({ msg: '', type: 'ok' })
  const [saving, setSaving]     = useState(false)

  const notify = (msg, type = 'ok') => {
    setToast({ msg, type })
    setTimeout(() => setToast({ msg: '', type: 'ok' }), 3500)
  }

  const loadData = async () => {
    const { data: s } = await supabase
      .from('walk_in_sessions').select('*').is('exit_time', null).order('entry_time')
    if (s) setSessions(s)

    const { data: sl } = await supabase
      .from('parking_slots').select('slot_id, is_occupied, is_booked, is_active, location').order('slot_id')
    if (sl) setAvSlots(sl.filter(s => s.is_active))

    const { data: p } = await supabase.from('pricing').select('*').order('price')
    if (p) setPricing(p)
  }

  useEffect(() => {
    ;(async () => { await loadData() })()
  }, [])

  const handleChange = e => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

  const getDurationMinutes = (label) => {
    const map = { '30 min': 30, '1 Hour': 60, '2 Hours': 120, '4 Hours': 240 }
    return map[label] || 60
  }

  const getPriceForDuration = (label) => {
    const p = pricing.find(p => p.duration_label === label)
    return p?.price || 0
  }

  const startSession = async (e) => {
    e.preventDefault()
    if (!form.slot_id) return notify('Please select a slot', 'err')
    setSaving(true)

    const durMin = form.duration_type === 'known' ? getDurationMinutes(form.duration_label) : null
    const amount = form.duration_type === 'known' ? getPriceForDuration(form.duration_label) : 0

    const sessionData = {
      user_name: form.user_name,
      phone: form.phone,
      vehicle_number: form.vehicle_number.toUpperCase(),
      vehicle_type: form.vehicle_type,
      slot_id: parseInt(form.slot_id),
      payment_method: form.payment_method,
      amount: amount || null,
      entry_time: new Date().toISOString(),
    }

    const { error: sErr } = await supabase.from('walk_in_sessions').insert(sessionData)
    if (sErr) { notify('Failed to save session: ' + sErr.message, 'err'); setSaving(false); return }

    // Mark slot occupied
    await supabase
      .from('parking_slots')
      .update({ is_occupied: true, vehicle_id: form.vehicle_number.toUpperCase(), last_updated: new Date().toISOString() })
      .eq('slot_id', parseInt(form.slot_id))

    // Log entry
    await supabase.from('parking_logs').insert({
      slot_id: parseInt(form.slot_id),
      vehicle_number: form.vehicle_number.toUpperCase(),
      entry_time: new Date().toISOString(),
      type: 'walkin',
      date: new Date().toISOString().split('T')[0],
    })

    notify(`Session started for ${form.user_name} in slot ${form.slot_id}`)
    setForm(INITIAL_FORM)
    setSaving(false)
    loadData()
  }

  const buildBillObj = (session, finalAmount) => {
    const now = new Date()
    const entryDate = new Date(session.entry_time)
    const diffMin = Math.ceil((now - entryDate) / 60000)
    return {
      bill_id: null,
      user_name: session.user_name,
      phone: session.phone,
      vehicle_number: session.vehicle_number,
      vehicle_type: session.vehicle_type,
      slot_id: session.slot_id,
      entry_time: entryDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      exit_time: now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      date: now.toLocaleDateString('en-IN'),
      duration: fmtDuration(session.exit_time ? session.duration_minutes : diffMin),
      amount: finalAmount,
      payment_method: session.payment_method,
    }
  }

  const endSession = async (session, finalAmount) => {
    const now = new Date().toISOString()
    const entryDate = new Date(session.entry_time)
    const diffMin = Math.ceil((new Date() - entryDate) / 60000)

    await supabase.from('walk_in_sessions').update({
      exit_time: now,
      amount: finalAmount,
      payment_status: 'paid',
    }).eq('session_id', session.session_id)

    await supabase.from('parking_slots').update({
      is_occupied: false, vehicle_id: null, last_updated: now,
    }).eq('slot_id', session.slot_id)

    await supabase.from('parking_logs').update({
      exit_time: now, duration_minutes: diffMin,
    }).eq('slot_id', session.slot_id).is('exit_time', null)

    notify(`Session ended for ${session.user_name}`)
    loadData()
  }

  const createBillRecord = async (session, finalAmount) => {
    const now = new Date()
    const entryDate = new Date(session.entry_time)
    const diffMin = Math.ceil((now - entryDate) / 60000)

    const { data, error } = await supabase.from('bills').insert({
      type: 'walkin',
      reference_id: session.session_id,
      user_name: session.user_name,
      phone: session.phone,
      vehicle_number: session.vehicle_number,
      vehicle_type: session.vehicle_type,
      slot_id: session.slot_id,
      entry_time: session.entry_time,
      exit_time: now.toISOString(),
      duration_minutes: diffMin,
      amount: finalAmount,
      payment_method: session.payment_method,
      payment_status: 'paid',
      created_at: now.toISOString(),
    }).select().single()

    if (error) { notify('Bill create failed: ' + error.message, 'err'); return null }
    return data
  }

  const handleBill = async (session, finalAmount) => {
    await endSession(session, finalAmount)
    const bill = await createBillRecord(session, finalAmount)
    if (bill) notify(`Bill #${bill.bill_id} created`)
  }

  const handlePrint = async (session, finalAmount) => {
    const billData = buildBillObj(session, finalAmount)
    const doc = generateBillPDF(billData)
    doc.save(`SpotFinder_Bill_${session.vehicle_number}.pdf`)
  }

  const handleWA = (session, finalAmount) => {
    const billData = buildBillObj(session, finalAmount)
    sendWhatsApp(billData)
  }

  return (
    <div className="wi-wrap">
      {toast.msg && <div className={`wi-toast ${toast.type}`}>{toast.msg}</div>}

      {/* ── New Walk-in Entry ─────────────────────────────── */}
      <section className="wi-section">
        <h2 className="wi-section-label"><UserPlus size={14} /> New Walk-in Entry</h2>

      {/* New Walk-in Form */}
      <div className="wi-panel">
        <h3 className="wi-panel-title"><UserPlus size={16} /> New Walk-in Entry</h3>
        <form className="wi-form" onSubmit={startSession}>
          <div className="wi-form-grid">
            <div className="wi-field">
              <label>Customer Name *</label>
              <input name="user_name" value={form.user_name} onChange={handleChange} placeholder="Full name" required />
            </div>
            <div className="wi-field">
              <label>Phone Number *</label>
              <input name="phone" value={form.phone} onChange={handleChange} placeholder="10-digit mobile" required maxLength={10} />
            </div>
            <div className="wi-field">
              <label>Vehicle Number *</label>
              <input name="vehicle_number" value={form.vehicle_number} onChange={handleChange} placeholder="TN01AB1234" required />
            </div>
            <div className="wi-field">
              <label>Vehicle Type</label>
              <select name="vehicle_type" value={form.vehicle_type} onChange={handleChange}>
                {['Car','Bike','Auto','Other'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="wi-field">
              <label>Select Slot *</label>
              <select name="slot_id" value={form.slot_id} onChange={handleChange} required>
                <option value="">-- Select Slot --</option>
                {avSlots.map(s => (
                  <option key={s.slot_id} value={s.slot_id}>
                    Slot {s.slot_id}{s.location ? ` — ${s.location}` : ''}
                    {s.is_occupied ? ' [Occupied]' : s.is_booked ? ' [Booked]' : ' ✓'}
                  </option>
                ))}
              </select>
            </div>
            <div className="wi-field">
              <label>Payment Method</label>
              <select name="payment_method" value={form.payment_method} onChange={handleChange}>
                <option>Cash</option>
                <option>UPI</option>
              </select>
            </div>
          </div>

          <div className="wi-duration-row">
            <span className="wi-field-label">Duration Type:</span>
            <label className="wi-radio">
              <input type="radio" name="duration_type" value="known" checked={form.duration_type === 'known'} onChange={handleChange} />
              Known Duration
            </label>
            <label className="wi-radio">
              <input type="radio" name="duration_type" value="open" checked={form.duration_type === 'open'} onChange={handleChange} />
              Open (calculate on exit)
            </label>
          </div>

          {form.duration_type === 'known' && (
            <div className="wi-field wi-field-inline">
              <label>Duration</label>
              <select name="duration_label" value={form.duration_label} onChange={handleChange}>
                {(pricing.length > 0
                  ? pricing.map(p => p.duration_label)
                  : ['30 min','1 Hour','2 Hours','4 Hours']
                ).map(d => <option key={d}>{d}</option>)}
              </select>
              {form.duration_type === 'known' && (
                <span className="wi-price-preview">
                  {RUPEE}{getPriceForDuration(form.duration_label)}
                </span>
              )}
            </div>
          )}

          <button type="submit" className="wi-submit-btn" disabled={saving}>
            {saving ? 'Starting...' : '▶ Start Session'}
          </button>
        </form>
      </div>
      </section>

      {/* ── Active Sessions ───────────────────────────────── */}
      <section className="wi-section">
        <h2 className="wi-section-label"><ClipboardList size={14} /> Active Sessions</h2>

      {/* Active Sessions */}
      <div className="wi-panel">
        <h3 className="wi-panel-title">Active Sessions ({sessions.length})</h3>
        {sessions.length === 0 ? (
          <div className="wi-empty">No active sessions right now.</div>
        ) : (
          <div className="wi-table-wrap">
            <table className="wi-table">
              <thead>
                <tr>
                  <th>Slot</th><th>Customer</th><th>Vehicle</th><th>Type</th>
                  <th>Entry</th><th>Timer</th><th>Duration</th><th>Amount</th>
                  <th>Payment</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map(s => (
                  <SessionRow
                    key={s.session_id}
                    session={s}
                    pricing={pricing}
                    onEnd={endSession}
                    onBill={handleBill}
                    onPrint={handlePrint}
                    onWA={handleWA}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </section>
    </div>
  )
}

export default WalkInManager
