import { useState, useEffect } from 'react'
import { supabase } from '../supabase/client'
import { Save, Lock, Info, Plus, Trash2 } from 'lucide-react'
import './Settings.css'

function Settings() {
  const [lotForm, setLotForm] = useState({
    name: 'SpotFinder IOT Parking',
    address: 'College Campus, Main Building Block',
    hours: '8:00 AM – 8:00 PM',
  })
  const [lotMsg, setLotMsg] = useState({ text: '', type: '' })

  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' })
  const [pwMsg, setPwMsg]   = useState({ text: '', type: '' })
  const [pwSaving, setPwSaving] = useState(false)
  const [lotSaving, setLotSaving] = useState(false)
  const [activeCount, setActiveCount] = useState('...')
  const [pricingRows, setPricingRows] = useState([])
  const [pricingSaving, setPricingSaving] = useState(null)
  const [pricingFeedback, setPricingFeedback] = useState({})

  useEffect(() => {
    supabase
      .from('parking_slots')
      .select('slot_id', { count: 'exact', head: true })
      .eq('is_active', true)
      .then(({ count }) => { if (count !== null) setActiveCount(count) })

    supabase.from('pricing').select('*').order('price')
      .then(({ data }) => { if (data) setPricingRows(data.map(r => ({ ...r, _edit: r.price }))) })
  }, [])

  const loadPricing = async () => {
    const { data } = await supabase.from('pricing').select('*').order('price')
    if (data) setPricingRows(data.map(r => ({ ...r, _edit: r.price })))
  }

  const savePricingRow = async (row) => {
    if (!row._edit || isNaN(row._edit)) return
    setPricingSaving(row.duration_label)
    await supabase.from('pricing').upsert({
      duration_label: row.duration_label, price: parseFloat(row._edit),
      updated_at: new Date().toISOString(),
    })
    setPricingSaving(null)
    setPricingFeedback(p => ({ ...p, [row.duration_label]: 'Saved!' }))
    setTimeout(() => setPricingFeedback(p => ({ ...p, [row.duration_label]: null })), 2000)
    loadPricing()
  }

  const deletePricingRow = async (label) => {
    if (!confirm(`Delete pricing for "${label}"?`)) return
    await supabase.from('pricing').delete().eq('duration_label', label)
    loadPricing()
  }

  const addPricingRow = async () => {
    const label = prompt('Enter duration label (e.g. "3 Hours"):')
    if (!label) return
    const price = parseFloat(prompt('Enter price (\u20b9):'))
    if (isNaN(price)) return
    await supabase.from('pricing').insert({ duration_label: label, price, updated_at: new Date().toISOString() })
    loadPricing()
  }

  const updatePriceEdit = (label, val) => {
    setPricingRows(prev => prev.map(r => r.duration_label === label ? { ...r, _edit: val } : r))
  }

  const notify = (setter, text, type = 'ok') => {
    setter({ text, type })
    setTimeout(() => setter({ text: '', type: '' }), 4000)
  }

  const saveLot = async (e) => {
    e.preventDefault()
    setLotSaving(true)
    // Store in localStorage as a simple config store (no users table edits needed)
    localStorage.setItem('sf_lot_config', JSON.stringify(lotForm))
    setLotSaving(false)
    notify(setLotMsg, 'Parking lot info saved successfully!')
  }

  const changePassword = async (e) => {
    e.preventDefault()
    if (pwForm.newPw !== pwForm.confirm) {
      return notify(setPwMsg, 'New passwords do not match.', 'err')
    }
    if (pwForm.newPw.length < 6) {
      return notify(setPwMsg, 'Password must be at least 6 characters.', 'err')
    }
    setPwSaving(true)

    // Verify current password by re-signing in
    const { data: { user } } = await supabase.auth.getUser()
    const { error: reAuthErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: pwForm.current,
    })
    if (reAuthErr) {
      setPwSaving(false)
      return notify(setPwMsg, 'Current password is incorrect.', 'err')
    }

    const { error } = await supabase.auth.updateUser({ password: pwForm.newPw })
    setPwSaving(false)
    if (error) notify(setPwMsg, error.message, 'err')
    else {
      notify(setPwMsg, 'Password changed successfully!')
      setPwForm({ current: '', newPw: '', confirm: '' })
    }
  }

  return (
    <div className="st-wrap">
      {/* Parking Lot Info */}
      <div className="st-panel">
        <h3 className="st-panel-title"><Save size={15} /> Parking Lot Information</h3>
        <form className="st-form" onSubmit={saveLot}>
          <div className="st-field">
            <label>Parking Lot Name</label>
            <input
              value={lotForm.name}
              onChange={e => setLotForm(p => ({ ...p, name: e.target.value }))}
              placeholder="SpotFinder IOT Parking"
              required
            />
          </div>
          <div className="st-field">
            <label>Address</label>
            <input
              value={lotForm.address}
              onChange={e => setLotForm(p => ({ ...p, address: e.target.value }))}
              placeholder="College Campus, Main Building"
              required
            />
          </div>
          <div className="st-field">
            <label>Operating Hours</label>
            <input
              value={lotForm.hours}
              onChange={e => setLotForm(p => ({ ...p, hours: e.target.value }))}
              placeholder="8:00 AM – 8:00 PM"
              required
            />
          </div>
          {lotMsg.text && <div className={`st-msg ${lotMsg.type}`}>{lotMsg.text}</div>}
          <button type="submit" className="st-submit-btn" disabled={lotSaving}>
            {lotSaving ? 'Saving...' : 'Save Info'}
          </button>
        </form>
      </div>

      {/* Change Password */}
      <div className="st-panel">
        <h3 className="st-panel-title"><Lock size={15} /> Change Admin Password</h3>
        <form className="st-form" onSubmit={changePassword}>
          <div className="st-field">
            <label>Current Password</label>
            <input
              type="password"
              value={pwForm.current}
              onChange={e => setPwForm(p => ({ ...p, current: e.target.value }))}
              placeholder="••••••••"
              required
            />
          </div>
          <div className="st-field">
            <label>New Password</label>
            <input
              type="password"
              value={pwForm.newPw}
              onChange={e => setPwForm(p => ({ ...p, newPw: e.target.value }))}
              placeholder="Min 6 characters"
              required
            />
          </div>
          <div className="st-field">
            <label>Confirm New Password</label>
            <input
              type="password"
              value={pwForm.confirm}
              onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))}
              placeholder="Repeat new password"
              required
            />
          </div>
          {pwMsg.text && <div className={`st-msg ${pwMsg.type}`}>{pwMsg.text}</div>}
          <button type="submit" className="st-submit-btn" disabled={pwSaving}>
            {pwSaving ? 'Updating...' : 'Change Password'}
          </button>
        </form>
      </div>

      {/* Parking Pricing */}
      <div className="st-panel">
        <div className="st-panel-header">
          <h3 className="st-panel-title">Parking Pricing</h3>
          <button className="st-add-btn" onClick={addPricingRow}><Plus size={14} /> Add Rate</button>
        </div>
        <p className="st-sub">Changes reflect instantly on client dashboard.</p>
        <table className="st-pricing-table">
          <thead><tr><th>Duration</th><th>Price (₹)</th><th>Updated</th><th></th></tr></thead>
          <tbody>
            {pricingRows.map(row => (
              <tr key={row.duration_label}>
                <td><span className="st-dur-tag">{row.duration_label}</span></td>
                <td>
                  <div className="st-price-input-wrap">
                    <span className="st-rupee">₹</span>
                    <input className="st-price-input" type="number" min="0" value={row._edit}
                      onChange={e => updatePriceEdit(row.duration_label, e.target.value)} />
                  </div>
                </td>
                <td className="st-updated">{row.updated_at ? new Date(row.updated_at).toLocaleDateString('en-IN') : '—'}</td>
                <td>
                  <div className="st-pricing-actions">
                    <button className="st-save-btn" onClick={() => savePricingRow(row)} disabled={pricingSaving === row.duration_label}>
                      {pricingSaving === row.duration_label ? 'Saving...' : 'Save'}
                    </button>
                    <button className="st-del-btn" onClick={() => deletePricingRow(row.duration_label)}><Trash2 size={13} /></button>
                  </div>
                  {pricingFeedback[row.duration_label] && <span className="st-saved-badge">{pricingFeedback[row.duration_label]}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {pricingRows.length === 0 && <div className="st-empty">No pricing configured.</div>}
      </div>

      {/* System Info */}
      <div className="st-panel">
        <h3 className="st-panel-title"><Info size={15} /> System Info</h3>
        <div className="st-info-grid">
          <div className="st-info-row"><span>Total Slots in DB</span><strong>20</strong></div>
          <div className="st-info-row"><span>Active Slots</span><strong>{activeCount}</strong></div>
          <div className="st-info-row"><span>Hardware Slots</span><strong>1 – 4 (IR Sensors)</strong></div>
          <div className="st-info-row"><span>MQTT Broker</span><strong>test.mosquitto.org</strong></div>
          <div className="st-info-row"><span>MQTT Topic</span><strong>spotfinder/slots</strong></div>
          <div className="st-info-row"><span>Supabase URL</span><strong className="st-info-url">{import.meta.env.VITE_SUPABASE_URL || '—'}</strong></div>
        </div>
      </div>
    </div>
  )
}

export default Settings
