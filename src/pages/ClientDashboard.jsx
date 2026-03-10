import { useState, useEffect } from 'react'
import { supabase } from '../supabase/client'
import { useMqttSlots } from '../hooks/useMqttSlots'
import Navbar from '../components/Navbar'
import SlotGrid from '../components/SlotGrid'
import LoginModal from '../components/LoginModal'
import { IndianRupee } from 'lucide-react'
import './ClientDashboard.css'

const RUPEE = '\u20B9'
const HW_IDS = [1, 2, 3, 4]

// ❗ Set your Android/iOS app download link here:
const APP_DOWNLOAD_URL = 'https://github.com/Chris7win/spotfinder-iot/releases/download/v1.0/app-release.apk'

// Rotating taglines shown in the hero section
const TAGLINES = [
  'Park Smarter, Not Harder.',
  'Your Spot Awaits — Zero Hassle.',
  'Drive In. Chill Out. We Got Your Spot.',
  'Smart Campus. Smarter Parking.',
  'Why Circle the Lot? We\'ll Save You a Spot.',
]


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

  // Pick a tagline based on the current minute so it rotates naturally
  const tagline = TAGLINES[new Date().getMinutes() % TAGLINES.length]

  // Time-aware greeting
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening'

  return (
    <div className="client-page">
      <Navbar mode="client" onLockClick={() => setShowLogin(true)} />

      {/* Hero */}
      <section className="client-hero">
        <div className="client-hero-content">
          <div className="hero-badge">
            {connected ? '● Live Parking Status' : '○ Parking Status'}
          </div>
          <p className="hero-greeting">{greeting}! Welcome to</p>
          <h1 className="hero-title">SpotFinder <span className="hero-title-accent">IOT</span></h1>
          <p className="hero-tagline">{tagline}</p>
          <p className="hero-sub">Smart Campus Parking — Powered by IoT Sensors</p>

          <div className="hero-counter-wrap">
            <div className="hero-counter">
              <span className="hero-count">{loading ? '...' : available}</span>
              <span className="hero-count-label">Spots Open</span>
            </div>
            <div className="hero-counter-divider" />
            <div className="hero-counter">
              <span className="hero-count hero-count-total">{activeCount}</span>
              <span className="hero-count-label">Total Slots</span>
            </div>
          </div>
        </div>
      </section>

      {/* Slot Grid */}
      <section className="client-section">
        <h2 className="section-title">Live Parking Slots</h2>
        <p className="section-desc">Tap-free visibility — see which spots are open right now.</p>
        {loading ? (
          <div className="client-loading">
            <div className="client-spinner" />
            Fetching live data...
          </div>
        ) : (
          <SlotGrid slots={mergedSlots} />
        )}
      </section>

      {/* Pricing */}
      <section className="client-section client-section-alt">
        <h2 className="section-title">Parking Rates</h2>
        <p className="section-desc">Transparent pricing — no hidden charges, ever.</p>
        {pricing.length > 0 ? (
          <div className="pricing-grid">
            {pricing.map(p => (
              <div className="pricing-card" key={p.duration_label}>
                <div className="pricing-duration">{p.duration_label}</div>
                <div className="pricing-amount">{RUPEE}{p.price}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="pricing-grid">
            {[['30 min',RUPEE+'15'],['1 Hour',RUPEE+'25'],['2 Hours',RUPEE+'45'],['4 Hours',RUPEE+'80']].map(([d,a]) => (
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
        <h3>Ready to Park Like a Pro?</h3>
        <p>Download the SpotFinder app — book, pay and park in under 30 seconds.</p>
        <button className="cta-btn" onClick={() => window.open(APP_DOWNLOAD_URL, '_blank')}>
          Get SpotFinder App
        </button>
        <span className="cta-footnote">Available on Android · Free to use</span>
      </section>

      {/* Motivation Strip */}
      <section className="client-motivation">
        <p>"A smooth journey starts with a great parking spot."</p>
        <p className="motivation-sub">Built with purpose for our campus community.</p>
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

