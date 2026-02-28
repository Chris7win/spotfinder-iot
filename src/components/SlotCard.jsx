import './SlotCard.css'

function SlotCard({ slot }) {
  const getStatus = () => {
    if (slot.is_occupied) return 'occupied'
    if (slot.is_booked) return 'booked'
    return 'available'
  }

  const statusLabels = {
    available: 'Available',
    occupied: 'Occupied',
    booked: 'Reserved',
  }

  const status = getStatus()

  const formatTime = (ts) => {
    if (!ts) return '—'
    return new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className={`slot-card ${status}`}>
      <div className="slot-card-header">
        <span className="slot-id">{slot.slot_id}</span>
        <span className={`slot-status-dot ${status}`} />
      </div>
      <span className={`slot-status-label ${status}`}>{statusLabels[status]}</span>
      {slot.vehicle_id && (
        <div className="slot-meta">
          <div>🚗 {slot.vehicle_id}</div>
          {slot.booked_by && <div>👤 {slot.booked_by}</div>}
        </div>
      )}
      <div className="slot-meta">Last updated: {formatTime(slot.last_updated)}</div>
    </div>
  )
}

export default SlotCard
