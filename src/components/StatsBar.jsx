import './StatsBar.css'

function StatsBar({ slots }) {
  const total = slots.length
  const available = slots.filter(s => !s.is_occupied && !s.is_booked).length
  const occupied  = slots.filter(s => s.is_occupied).length
  const booked    = slots.filter(s => s.is_booked && !s.is_occupied).length

  const stats = [
    { label: 'Total Slots',  value: total,     sub: 'all slots' },
    { label: 'Available',    value: available,  sub: 'open now' },
    { label: 'Occupied',     value: occupied,   sub: 'in use' },
    { label: 'Reserved',     value: booked,     sub: 'app booking' },
  ]

  return (
    <div className="stats-bar">
      {stats.map(s => (
        <div className="stat-card" key={s.label}>
          <span className="stat-card-label">{s.label}</span>
          <span className="stat-card-value">{s.value}</span>
          <span className="stat-card-sub">{s.sub}</span>
        </div>
      ))}
    </div>
  )
}

export default StatsBar
