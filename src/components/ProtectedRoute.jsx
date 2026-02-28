import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase/client'

// Allowed admin emails from .env (comma-separated)
const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS || '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean)

function ProtectedRoute({ children }) {
  const [checking, setChecking]     = useState(true)
  const [authenticated, setAuth]    = useState(false)
  const [denied, setDenied]         = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/')
        setChecking(false)
        return
      }

      const email = session.user.email?.toLowerCase() || ''

      // If no whitelist configured, allow any authenticated user (fallback)
      if (ADMIN_EMAILS.length === 0 || ADMIN_EMAILS.includes(email)) {
        setAuth(true)
      } else {
        // Logged in but not an admin — sign them out and show denied
        supabase.auth.signOut()
        setDenied(true)
      }
      setChecking(false)
    })
  }, [navigate])

  if (checking) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
        Checking access...
      </div>
    )
  }

  if (denied) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: '100vh', gap: '1rem',
        fontFamily: 'Segoe UI, sans-serif',
      }}>
        <div style={{ fontSize: '2rem' }}>🚫</div>
        <h2 style={{ color: '#e74c3c', margin: 0 }}>Access Denied</h2>
        <p style={{ color: '#666', margin: 0 }}>Your account is not authorised to access the admin panel.</p>
        <button
          onClick={() => navigate('/')}
          style={{
            background: '#1a1a2e', color: '#fff', border: 'none',
            borderRadius: '8px', padding: '0.65rem 1.5rem',
            cursor: 'pointer', fontWeight: 600,
          }}
        >
          Back to Home
        </button>
      </div>
    )
  }

  if (!authenticated) return null

  return children
}

export default ProtectedRoute