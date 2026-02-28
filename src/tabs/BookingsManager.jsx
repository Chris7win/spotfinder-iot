import { useState, useEffect } from 'react'
import { supabase } from '../supabase/client'
import { jsPDF } from 'jspdf'
import { Search, MessageCircle, CheckCircle, XCircle, StopCircle } from 'lucide-react'
import './BookingsManager.css'

function generateBookingPDF(b) {
  const doc = new jsPDF({ unit: 'mm', format: [80, 150] })
  const x = 5; let y = 8
  const line = (txt, size = 8, bold = false) => {
    doc.setFontSize(size); doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.text(txt, x, y); y += size * 0.55
  }
  const divider = () => { doc.setDrawColor(200); doc.line(x, y, 75, y); y += 4 }

  doc.setFont('helvetica', 'bold'); doc.setFontSize(11)
  doc.text('SPOTFINDER IOT', 40, y, { align: 'center' }); y += 6
  doc.setFontSize(8); doc.setFont('helvetica', 'normal')
  doc.text('Booking Receipt', 40, y, { align: 'center' }); y += 5
  divider()
  line(`Booking ID:     #${b.booking_id}`)
  line(`Date:           ${new Date(b.created_at).toLocaleDateString('en-IN')}`)
  line(`Arrival:        ${b.arrival_time ? new Date(b.arrival_time).toLocaleString('en-IN') : 'N/A'}`)
  divider()
  line(`Customer:       ${b.user_name || '—'}`)
  line(`Phone:          ${b.phone || '—'}`)
  line(`Vehicle No:     ${b.vehicle_number || '—'}`)
  line(`Vehicle Type:   ${b.vehicle_type || '—'}`)
  divider()
  line(`Slot:           ${b.slot_id}`)
  line(`Duration:       ${b.duration || '—'}`)
  divider()
  line(`Amount:         Rs.${b.amount}`, 9, true)
  line(`Payment:        ${b.payment_status}`)
  line(`Status:         ${b.status}`, 8, true)
  divider()
  doc.setFontSize(7)
  doc.text('Thank you for using SpotFinder!', 40, y, { align: 'center' })
  return doc
}

function sendBookingWhatsApp(b) {
  const message =
`🅿 *SpotFinder IOT — Booking Receipt*

📋 Booking ID: #${b.booking_id}
📅 Date: ${new Date(b.created_at).toLocaleDateString('en-IN')}

👤 Name: ${b.user_name || '—'}
📱 Phone: ${b.phone || '—'}
🚗 Vehicle: ${b.vehicle_number || '—'}

🅿 Slot: ${b.slot_id}
⏱ Duration: ${b.duration || '—'}
🕐 Arrival: ${b.arrival_time ? new Date(b.arrival_time).toLocaleString('en-IN') : '—'}

💰 Amount: ₹${b.amount}
💳 Payment: ${b.payment_status}
✅ Status: ${b.status}

Thank you for booking with SpotFinder IOT! 🚗`
  window.open(`https://wa.me/91${b.phone}?text=${encodeURIComponent(message)}`, '_blank')
}

function BookingsManager() {
  const [bookings, setBookings] = useState([])
  const [filters, setFilters]   = useState({ date: '', slot: '', status: '' })
  const [qrInput, setQrInput]   = useState('')
  const [qrResult, setQrResult] = useState(null)
  const [qrError, setQrError]   = useState('')
  const [toast, setToast]       = useState('')
  const [loading, setLoading]   = useState(true)

  const notify = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const load = async () => {
    setLoading(true)
    let q = supabase.from('bookings').select('*').order('created_at', { ascending: false })
    if (filters.date)   q = q.gte('arrival_time', filters.date).lte('arrival_time', filters.date + 'T23:59:59')
    if (filters.slot)   q = q.eq('slot_id', filters.slot)
    if (filters.status) q = q.eq('status', filters.status)
    const { data } = await q
    if (data) setBookings(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [filters])

  const updateStatus = async (id, status) => {
    await supabase.from('bookings').update({ status }).eq('booking_id', id)
    notify(`Booking ${id} → ${status}`)
    load()
  }

  const endSession = async (b) => {
    await supabase.from('bookings').update({ status: 'completed' }).eq('booking_id', b.booking_id)
    await supabase.from('parking_slots').update({ is_booked: false, is_occupied: false, booked_by: null, vehicle_id: null, last_updated: new Date().toISOString() }).eq('slot_id', b.slot_id)
    notify(`Session ended for booking ${b.booking_id}`)
    load()
  }

  const genBill = async (b) => {
    const { data, error } = await supabase.from('bills').insert({
      type: 'booked', reference_id: b.booking_id, user_name: b.user_name, phone: b.phone,
      vehicle_number: b.vehicle_number, vehicle_type: b.vehicle_type, slot_id: b.slot_id,
      entry_time: b.arrival_time, exit_time: new Date().toISOString(),
      duration_minutes: null, amount: b.amount, payment_method: b.payment_status,
      payment_status: 'paid', created_at: new Date().toISOString(),
    }).select().single()
    if (error) return notify('Bill error: ' + error.message)
    const doc = generateBookingPDF(b)
    doc.save(`Booking_Bill_${b.booking_id}.pdf`)
    notify(`Bill created & PDF downloaded`)
  }

  const verifyQR = async () => {
    setQrError(''); setQrResult(null)
    if (!qrInput.trim()) return
    const { data, error } = await supabase.from('bookings').select('*').eq('qr_token', qrInput.trim()).single()
    if (error || !data) { setQrError('No booking found for this QR token.'); return }
    setQrResult(data)
  }

  const statusColors = { confirmed: '#3498db', pending: '#f39c12', completed: '#2ecc71', cancelled: '#e74c3c' }

  return (
    <div className="bm-wrap">
      {toast && <div className="bm-toast">{toast}</div>}

      {/* QR Verifier */}
      <div className="bm-panel">
        <h3 className="bm-panel-title"><Search size={15} /> QR Code Verifier</h3>
        <div className="bm-qr-row">
          <input
            className="bm-qr-input"
            placeholder="Scan or enter QR token..."
            value={qrInput}
            onChange={e => setQrInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && verifyQR()}
          />
          <button className="bm-qr-btn" onClick={verifyQR}>Verify</button>
        </div>
        {qrError && <div className="bm-qr-error">{qrError}</div>}
        {qrResult && (
          <div className="bm-qr-result">
            <div className="bm-qr-field"><span>Booking ID</span><strong>#{qrResult.booking_id}</strong></div>
            <div className="bm-qr-field"><span>Customer</span><strong>{qrResult.user_name || '—'}</strong></div>
            <div className="bm-qr-field"><span>Slot</span><strong>{qrResult.slot_id}</strong></div>
            <div className="bm-qr-field"><span>Vehicle</span><strong>{qrResult.vehicle_number}</strong></div>
            <div className="bm-qr-field"><span>Status</span>
              <span className="bm-status-tag" style={{ background: statusColors[qrResult.status] + '20', color: statusColors[qrResult.status] }}>
                {qrResult.status}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bm-filters">
        <input type="date" className="bm-filter-input" value={filters.date}
          onChange={e => setFilters(p => ({ ...p, date: e.target.value }))} />
        <input placeholder="Slot (A1...)" className="bm-filter-input" value={filters.slot}
          onChange={e => setFilters(p => ({ ...p, slot: e.target.value }))} />
        <select className="bm-filter-input" value={filters.status}
          onChange={e => setFilters(p => ({ ...p, status: e.target.value }))}>
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <button className="bm-reset-btn" onClick={() => setFilters({ date: '', slot: '', status: '' })}>Reset</button>
      </div>

      {/* Table */}
      <div className="bm-panel">
        <h3 className="bm-panel-title">App Bookings ({bookings.length})</h3>
        {loading ? (
          <div className="bm-empty">Loading...</div>
        ) : bookings.length === 0 ? (
          <div className="bm-empty">No bookings found.</div>
        ) : (
          <div className="bm-table-wrap">
            <table className="bm-table">
              <thead>
                <tr>
                  <th>ID</th><th>Customer</th><th>Phone</th><th>Slot</th>
                  <th>Vehicle</th><th>Type</th><th>Arrival</th><th>Duration</th>
                  <th>Amount</th><th>Payment</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map(b => (
                  <tr key={b.booking_id}>
                    <td>#{b.booking_id?.toString().slice(-6)}</td>
                    <td>{b.user_name || '—'}</td>
                    <td>{b.phone || '—'}</td>
                    <td><span className="bm-slot-tag">{b.slot_id}</span></td>
                    <td>{b.vehicle_number || '—'}</td>
                    <td>{b.vehicle_type || '—'}</td>
                    <td>{b.arrival_time ? new Date(b.arrival_time).toLocaleString('en-IN') : '—'}</td>
                    <td>{b.duration || '—'}</td>
                    <td>₹{b.amount || 0}</td>
                    <td><span className="bm-pay-tag">{b.payment_status || '—'}</span></td>
                    <td>
                      <span className="bm-status-tag"
                        style={{ background: (statusColors[b.status] || '#999') + '20', color: statusColors[b.status] || '#999' }}>
                        {b.status}
                      </span>
                    </td>
                    <td>
                      <div className="bm-actions">
                        {b.status === 'pending' && (
                          <button className="bm-btn confirm" onClick={() => updateStatus(b.booking_id, 'confirmed')}>
                            <CheckCircle size={12} />Confirm
                          </button>
                        )}
                        {(b.status === 'pending' || b.status === 'confirmed') && (
                          <button className="bm-btn cancel" onClick={() => updateStatus(b.booking_id, 'cancelled')}>
                            <XCircle size={12} />Cancel
                          </button>
                        )}
                        {b.status === 'confirmed' && (
                          <button className="bm-btn end" onClick={() => endSession(b)}>
                            <StopCircle size={12} />End
                          </button>
                        )}
                        {b.status === 'completed' && (
                          <>
                            <button className="bm-btn bill" onClick={() => genBill(b)}>
                              PDF Bill
                            </button>
                            <button className="bm-btn wa" onClick={() => sendBookingWhatsApp(b)}>
                              <MessageCircle size={12} />WA
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default BookingsManager
