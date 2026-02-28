import { useState, useEffect } from 'react'
import { supabase } from '../supabase/client'
import Navbar from '../components/Navbar'
import SlotGrid from '../components/SlotGrid'
import LoginModal from '../components/LoginModal'
import './ClientDashboard.css'

function ClientDashboard() {
  const [slots, setSlots]         = useState([])
  const [pricing, setPricing]     = useState([])
  const [showLogin, setShowLogin] = useState(false)
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    const fetchInitial = async () => {
      const { data } = await supabase.from('parking_slots').select('*').order('slot_id')
      if (data) setSlots(data)
      const { data: prices } = await supabase.from('pricing').select('*').order('price')
      if (prices) setPricing(prices)
      setLoading(false)
    }
    fetchInitial()

    const channel = supabase
      .channel('client-slots')
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

    return () => supabase.removeChannel(channel)
  }, [])

  const available = slots.filter(s => !s.is_occupied && !s.is_booked).length

  return (
    <div className="client-page">
      <Navbar mode="client" onLockClick={() => setShowLogin(true)} />

      {/* Hero */}
      <section className="client-hero">
        <div className="client-hero-content">
          <div className="hero-badge">Live Parking Status</div>
          <h1 className="hero-title">Find Your Parking Spot</h1>
          <p className="hero-sub">SpotFinder IOT Smart Parking – College Campus</p>
          <div className="hero-counter">
            <span className="hero-count">{loading ? '...' : available}</span>
            <span className="hero-count-label">Available out of {slots.length} slots</span>
          </div>
        </div>
      </section>

      {/* Slot Grid */}
      <section className="client-section">
        <h2 className="section-title">Parking Slots</h2>
        {loading ? (
          <div className="client-loading">Loading slots...</div>
        ) : (
          <SlotGrid slots={slots} />
        )}
      </section>

      {/* Pricing */}
      <section className="client-section">
        <h2 className="section-title">Parking Rates</h2>
        {pricing.length > 0 ? (
          <div className="pricing-grid">
            {pricing.map(p => (
              <div className="pricing-card" key={p.duration_label}>
                <div className="pricing-duration">{p.duration_label}</div>
                <div className="pricing-amount">₹{p.price}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="pricing-grid">
            {[['30 min','₹15'],['1 Hour','₹25'],['2 Hours','₹45'],['4 Hours','₹80']].map(([d,a]) => (
              <div className="pricing-card" key={d}>
                <div className="pricing-duration">{d}</div>
                <div className="pricing-amount">{a}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* CTA */}
      <section className="client-cta">
        <h3>Ready to park?</h3>
        <p>Download SpotFinder App to book your slot instantly</p>
        <button className="cta-btn">Book via App</button>
      </section>

      {/* Footer */}
      <footer className="client-footer">
        <strong>SpotFinder IOT</strong> · College Campus Parking
        <span>Operating Hours: 8:00 AM – 8:00 PM</span>
        <span>4 Slots Available</span>
      </footer>

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </div>
  )
}

export default ClientDashboard
