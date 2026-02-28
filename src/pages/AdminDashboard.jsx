import { useState, useEffect } from 'react'
import { supabase } from '../supabase/client'
import Navbar from '../components/Navbar'
import Overview        from '../tabs/Overview'
import SlotMonitor     from '../tabs/SlotMonitor'
import WalkInManager   from '../tabs/WalkInManager'
import BookingsManager from '../tabs/BookingsManager'
import BillCenter      from '../tabs/BillCenter'
import Accounting      from '../tabs/Accounting'
import Analytics       from '../tabs/Analytics'
import DailyRecords    from '../tabs/DailyRecords'
import PricingManager  from '../tabs/PricingManager'
import Settings        from '../tabs/Settings'
import './AdminDashboard.css'

const TABS = [
  { id: 'overview',   label: 'Overview'       },
  { id: 'slots',      label: 'Slot Monitor'   },
  { id: 'walkin',     label: 'Walk-in Manager'},
  { id: 'bookings',   label: 'Bookings'       },
  { id: 'bills',      label: 'Bill Center'    },
  { id: 'accounting', label: 'Accounting'     },
  { id: 'analytics',  label: 'Analytics'      },
  { id: 'records',    label: 'Daily Records'  },
  { id: 'pricing',    label: 'Pricing'        },
  { id: 'settings',   label: 'Settings'       },
]

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview')
  const [adminEmail, setAdminEmail] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setAdminEmail(user.email)
    })
  }, [])

  const renderTab = () => {
    switch (activeTab) {
      case 'overview':   return <Overview />
      case 'slots':      return <SlotMonitor />
      case 'walkin':     return <WalkInManager />
      case 'bookings':   return <BookingsManager />
      case 'bills':      return <BillCenter />
      case 'accounting': return <Accounting />
      case 'analytics':  return <Analytics />
      case 'records':    return <DailyRecords />
      case 'pricing':    return <PricingManager />
      case 'settings':   return <Settings />
      default:           return <Overview />
    }
  }

  return (
    <div className="admin-page">
      <Navbar mode="admin" adminEmail={adminEmail} />

      {/* Tab Bar */}
      <div className="admin-tab-bar">
        <div className="admin-tab-scroll">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`admin-tab ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <main className="admin-content">
        <div className="admin-tab-inner">
          {renderTab()}
        </div>
      </main>
    </div>
  )
}

export default AdminDashboard
