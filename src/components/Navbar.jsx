import { Lock, LogOut, MapPin } from 'lucide-react'
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
        <div className="navbar-brand">
          <MapPin size={22} color="#3498db" />
          <span className="navbar-logo-text">SpotFinder <span className="navbar-accent">Admin</span></span>
        </div>
        <div className="navbar-right">
          {adminEmail && <span className="navbar-email">{adminEmail}</span>}
          <button className="navbar-logout-btn" onClick={handleLogout}>
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </nav>
    )
  }

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <MapPin size={22} color="#3498db" />
        <span className="navbar-logo-text">SpotFinder <span className="navbar-accent">IOT</span></span>
      </div>
      <div className="navbar-right">
        <button className="navbar-lock-btn" onClick={onLockClick} title="Admin Login">
          <Lock size={14} />
        </button>
      </div>
    </nav>
  )
}

export default Navbar
