import { useState, useEffect } from 'react'
import { supabase } from '../supabase/client'
import { Save, Plus, Trash2 } from 'lucide-react'
import './PricingManager.css'

function PricingManager() {
  const [rows, setRows]       = useState([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState(null)
  const [feedback, setFeedback] = useState({}) // { [duration_label]: { msg, type } }

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

  const addRow = async () => {
    const label = prompt('Enter duration label (e.g. "3 Hours"):')
    if (!label) return
    const price = parseFloat(prompt('Enter price (₹):'))
    if (isNaN(price)) return
    await supabase.from('pricing').insert({ duration_label: label, price, updated_at: new Date().toISOString() })
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
          <button className="pm-add-btn" onClick={addRow}>
            <Plus size={15} /> Add Rate
          </button>
        </div>
        <p className="pm-sub">Edit prices inline and save per row. Changes reflect instantly on the client dashboard.</p>

        <table className="pm-table">
          <thead>
            <tr><th>Duration</th><th>Price (₹)</th><th>Last Updated</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.duration_label}>
                <td><span className="pm-dur-tag">{row.duration_label}</span></td>
                <td>
                  <div className="pm-price-input-wrap">
                    <span className="pm-rupee">₹</span>
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
