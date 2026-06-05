import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Search, LogOut, Shield } from 'lucide-react'

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/checks/new', icon: Search, label: 'New Check' },
]

export default function Layout() {
  const navigate = useNavigate()

  function logout() {
    localStorage.removeItem('clearpath_auth')
    navigate('/login')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#080b10' }}>
      <aside style={{
        width: '220px', flexShrink: 0,
        backgroundColor: '#0d1117',
        borderRight: '1px solid #21262d',
        display: 'flex', flexDirection: 'column',
        padding: '20px 0',
        position: 'sticky', top: 0, height: '100vh',
      }}>
        <div style={{ padding: '4px 20px 28px', display: 'flex', alignItems: 'center', gap: '9px' }}>
          <Shield size={20} color="#00e5a0" />
          <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '15px', color: '#e6edf3', letterSpacing: '0.08em' }}>
            CLEARPATH
          </span>
        </div>

        <nav style={{ flex: 1, padding: '0 10px' }}>
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: '9px',
              padding: '9px 10px', borderRadius: '6px', marginBottom: '2px',
              textDecoration: 'none', fontSize: '13px', fontWeight: 500,
              color: isActive ? '#00e5a0' : '#7d8590',
              backgroundColor: isActive ? 'rgba(0,229,160,0.08)' : 'transparent',
              transition: 'all 0.15s',
            })}>
              <Icon size={15} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div style={{ padding: '0 10px', borderTop: '1px solid #21262d', paddingTop: '16px', marginTop: '16px' }}>
          <button onClick={logout} style={{
            display: 'flex', alignItems: 'center', gap: '9px',
            padding: '9px 10px', borderRadius: '6px', width: '100%',
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#7d8590', fontSize: '13px', fontWeight: 500,
          }}>
            <LogOut size={15} /> Sign Out
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, overflowY: 'auto' }}>
        <Outlet />
      </main>
    </div>
  )
}
