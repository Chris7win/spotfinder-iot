import { useState, useEffect } from 'react'
import { supabase } from '../supabase/client'
import { Save, Plus, Trash2, X, IndianRupee } from 'lucide-react'
import './PricingManager.css'

const RUPEE = '\u20B9'

function PricingManager() {
  const [rows, setRows]       = useState([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState(null)
  const [feedback, setFeedback] = useState({})
  const [showAdd, setShowAdd]   = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [addSaving, setAddSaving] = useState(false)

  const load = async () => {
    const { data } = await supabase.from('pricing').select('*').order('price')
    if (data) setRows(data.map(r => ({ ...r, _edit: r.price })))
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const setMsg = (label, msg, type = 'ok') => {
    setFeedback(p => ({ ...p, [label]: { msg, type } }))
    setTimeout(() => setFeedback(p => ({ ...p, [label]: null })), 3000)
  }

  const saveRow = async (row) => {
    if (!row._edit || isNaN(row._edit)) return setMsg(row.duration_label, 'Invalid price', 'err')
    setSavingId(row.duration_label)
    const { error } = await supabase.from('pricing').upsert({
      duration_label: row.duration_label,
      price: parseFloat(row._edit),
      updated_at: new Date().toISOString(),
    })
    setSavingId(null)
    if (error) setMsg(row.duration_label, 'Save failed: ' + error.message, 'err')
    else { setMsg(row.duration_label, 'Saved!', 'ok'); load() }
  }

  const deleteRow = async (label) => {
    if (!confirm(`Delete pricing for "${label}"?`)) return
    await supabase.from('pricing').delete().eq('duration_label', label)
    load()
  }

  const addRow = async (e) => {
    e.preventDefault()
    if (!newLabel.trim() || !newPrice || isNaN(parseFloat(newPrice))) return
    setAddSaving(true)
    await supabase.from('pricing').insert({
      duration_label: newLabel.trim(),
      price: parseFloat(newPrice),
      updated_at: new Date().toISOString(),
    })
    setNewLabel('')
    setNewPrice('')
    setShowAdd(false)
    setAddSaving(false)
    load()
  }

  const updateEdit = (label, val) => {
    setRows(prev => prev.map(r => r.duration_label === label ? { ...r, _edit: val } : r))
  }

  if (loading) return <div className="pm-loading">Loading pricing...</div>

  return (
    <div className="pm-wrap">
      <div className="pm-panel">
        <div className="pm-header">
          <h3 className="pm-title">Parking Pricing</h3>
          <button className="pm-add-btn" onClick={() => setShowAdd(true)}>
            <Plus size={15} /> Add Rate
          </button>
        </div>
        <p className="pm-sub">Edit prices inline and save per row. Changes reflect instantly on the client dashboard.</p>

        {showAdd && (
          <form className="pm-add-form" onSubmit={addRow}>
            <div className="pm-add-field">
              <label>Duration Label</label>
              <input
                className="pm-add-input"
                placeholder='e.g. "3 Hours"'
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                autoFocus
                required
              />
            </div>
            <div className="pm-add-field">
              <label>Price ({RUPEE})</label>
              <input
                className="pm-add-input"
                type="number"
                min="0"
                placeholder="0"
                value={newPrice}
                onChange={e => setNewPrice(e.target.value)}
                required
              />
            </div>
            <div className="pm-add-actions">
              <button type="submit" className="pm-add-save" disabled={addSaving}>
                <Plus size={13} /> {addSaving ? 'Adding...' : 'Add Rate'}
              </button>
              <button type="button" className="pm-add-cancel" onClick={() => { setShowAdd(false); setNewLabel(''); setNewPrice('') }}>
                <X size={13} /> Cancel
              </button>
            </div>
          </form>
        )}

        <table className="pm-table">
          <thead>
            <tr><th>Duration</th><th>Price ({RUPEE})</th><th>Last Updated</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.duration_label}>
                <td><span className="pm-dur-tag">{row.duration_label}</span></td>
                <td>
                  <div className="pm-price-input-wrap">
                    <span className="pm-rupee"><IndianRupee size={13} style={{display:'inline',verticalAlign:'middle'}} /></span>
                    <input
                      className="pm-price-input"
                      type="number"
                      min="0"
                      value={row._edit}
                      onChange={e => updateEdit(row.duration_label, e.target.value)}
                    />
                  </div>
                </td>
                <td className="pm-updated">
                  {row.updated_at ? new Date(row.updated_at).toLocaleDateString('en-IN') : '—'}
                </td>
                <td>
                  <div className="pm-actions">
                    <button
                      className="pm-btn save"
                      onClick={() => saveRow(row)}
                      disabled={savingId === row.duration_label}
                    >
                      <Save size={13} />
                      {savingId === row.duration_label ? 'Saving...' : 'Save'}
                    </button>
                    <button className="pm-btn delete" onClick={() => deleteRow(row.duration_label)}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                  {feedback[row.duration_label] && (
                    <div className={`pm-feedback ${feedback[row.duration_label].type}`}>
                      {feedback[row.duration_label].msg}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {rows.length === 0 && (
          <div className="pm-empty">No pricing configured. Click "Add Rate" to add one.</div>
        )}
      </div>
    </div>
  )
}

export default PricingManager
