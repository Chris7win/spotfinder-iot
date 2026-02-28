import { useState } from 'react'
import { supabase } from '../supabase/client'
import { Save, Lock } from 'lucide-react'
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
    </div>
  )
}

export default Settings
