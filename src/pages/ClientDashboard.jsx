import { useState, useEffect } from 'react'
import { supabase } from '../supabase/client'
import { useMqttSlots } from '../hooks/useMqttSlots'
import Navbar from '../components/Navbar'
import SlotGrid from '../components/SlotGrid'
import LoginModal from '../components/LoginModal'
import './ClientDashboard.css'

const HW_IDS = [1, 2, 3, 4]

// ❗ Set your Android/iOS app download link here:
const APP_DOWNLOAD_URL = 'https://play.google.com/store/apps/details?id=YOUR_APP_ID'

function ClientDashboard() {
  const [slots,       setSlots]       = useState([])
  const [pricing,     setPricing]     = useState([])
  const [showLogin,   setShowLogin]   = useState(false)
  const [loading,     setLoading]     = useState(true)

  const { mqttSlots, connected, lastSeen } = useMqttSlots()

  useEffect(() => {
    const fetchInitial = async () => {
      // Only fetch active slots — inactive ones are not shown to clients
      const { data } = await supabase
        .from('parking_slots')
        .select('*')
        .eq('is_active', true)
        .order('slot_id')
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
          // If the slot became inactive, remove it from the visible list
          if (!payload.new.is_active) {
            return prev.filter(s => s.slot_id !== payload.new.slot_id)
          }
          const updated = [...prev]
          const idx = updated.findIndex(s => s.slot_id === payload.new.slot_id)
          if (idx >= 0) updated[idx] = payload.new
          else updated.push(payload.new)
          return updated.sort((a, b) => a.slot_id - b.slot_id)
        })
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  // Merge live MQTT occupancy into HW slots for the most up-to-date display.
  // Only apply MQTT override once we've received at least one real message
  // (lastSeen != null), so stale initial state never masks Supabase data.
  const mergedSlots = slots.map(s => {
    if (!HW_IDS.includes(s.slot_id)) return s
    if (!lastSeen) return s                          // no MQTT data yet — show Supabase
    const live = mqttSlots.find(m => m.slot_id === s.slot_id)
    if (!live) return s
    return { ...s, is_occupied: live.is_occupied }
  })

  const activeCount = slots.length
  const available   = mergedSlots.filter(s => !s.is_occupied && !s.is_booked).length

  return (
    <div className="client-page">
      <Navbar mode="client" onLockClick={() => setShowLogin(true)} />

      {/* Hero */}
      <section className="client-hero">
        <div className="client-hero-content">
          <div className="hero-badge">
            {connected ? '● Live Parking Status' : '○ Parking Status'}
          </div>
          <h1 className="hero-title">Find Your Parking Spot</h1>
          <p className="hero-sub">SpotFinder IOT Smart Parking – College Campus</p>
          <div className="hero-counter">
            <span className="hero-count">{loading ? '...' : available}</span>
            <span className="hero-count-label">Available out of {activeCount} slots</span>
          </div>
        </div>
      </section>

      {/* Slot Grid */}
      <section className="client-section">
        <h2 className="section-title">Parking Slots</h2>
        {loading ? (
          <div className="client-loading">Loading slots...</div>
        ) : (
          <SlotGrid slots={mergedSlots} />
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
        <button className="cta-btn" onClick={() => window.open(APP_DOWNLOAD_URL, '_blank')}>
          Download SpotFinder App
        </button>
      </section>

      {/* Footer */}
      <footer className="client-footer">
        <strong>SpotFinder IOT</strong> · College Campus Parking
        <span>Operating Hours: 8:00 AM – 8:00 PM</span>
        <span>{activeCount} Active Slot{activeCount !== 1 ? 's' : ''}</span>
      </footer>

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </div>
  )
}

export default ClientDashboard

