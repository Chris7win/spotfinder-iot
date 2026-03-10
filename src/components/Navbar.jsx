import { Lock, LogOut, MapPin, Shield } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase/client'
import './Navbar.css'

function Navbar({ mode = 'client', onLockClick, adminEmail }) {
  const navigate = useNavigate()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  if (mode === 'admin') {
    return (
      <nav className="navbar">
        <div className="navbar-inner">
          <div className="navbar-brand">
            <div className="navbar-logo-icon">
              <MapPin size={20} />
            </div>
            <div className="navbar-brand-text">
              <span className="navbar-logo-text">SpotFinder</span>
              <span className="navbar-badge">Admin Panel</span>
            </div>
          </div>
          <div className="navbar-right">
            {adminEmail && (
              <div className="navbar-user">
                <Shield size={14} />
                <span className="navbar-email">{adminEmail}</span>
              </div>
            )}
            <button className="navbar-logout-btn" onClick={handleLogout}>
              <LogOut size={15} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </nav>
    )
  }

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <div className="navbar-brand">
          <div className="navbar-logo-icon">
            <MapPin size={20} />
          </div>
          <div className="navbar-brand-text">
            <span className="navbar-logo-text">SpotFinder</span>
            <span className="navbar-badge">IOT</span>
          </div>
        </div>
        <div className="navbar-right">
          <button className="navbar-lock-btn" onClick={onLockClick} title="Admin Login">
            <Lock size={14} />
          </button>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
