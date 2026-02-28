import SlotCard from './SlotCard'
import './SlotGrid.css'

function SlotGrid({ slots }) {
  if (!slots || slots.length === 0) {
    return <div className="slot-grid"><p style={{ gridColumn: 'span 2', textAlign: 'center', color: '#aaa' }}>Loading slots...</p></div>
  }
  return (
    <div className="slot-grid">
      {slots.map(slot => (
        <SlotCard key={slot.slot_id} slot={slot} />
      ))}
    </div>
  )
}

export default SlotGrid
