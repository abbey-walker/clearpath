import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, ScanSearch, LogOut, Sun, Moon } from 'lucide-react'

function getTheme() { return localStorage.getItem('cp_theme') || 'dark' }
function applyTheme(t) {
  localStorage.setItem('cp_theme', t)
  document.documentElement.setAttribute('data-theme', t)
}

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/checks/new', icon: ScanSearch,      label: 'New Check' },
]

export default function Layout() {
  const navigate = useNavigate()
  const auth = JSON.parse(localStorage.getItem('clearpath_auth') || '{}')
  const [theme, setThemeState] = useState(getTheme)

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    applyTheme(next)
    setThemeState(next)
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>

      {/* ── Sidebar ─────────────────────────────── */}
      <aside style={{
        width: 220, flexShrink: 0,
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        position: 'sticky', top: 0, height: '100vh',
      }}>
        {/* Wordmark */}
        <div style={{ padding: '28px 24px 24px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width={22} height={22} viewBox="0 0 22 22" fill="none">
              <circle cx={11} cy={11} r={10} stroke="var(--accent)" strokeWidth={1.5} />
              <path d="M7 11.5l3 3 5-5" stroke="var(--accent)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span style={{ color: 'var(--tx)', fontWeight: 700, fontSize: 15, letterSpacing: '-0.01em' }}>
              ClearPath
            </span>
          </div>
          <div style={{ color: 'var(--tx-3)', fontSize: 11, marginTop: 4, letterSpacing: '0.04em' }}>
            AML · KYC · Risk Intelligence
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 10px' }}>
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 14px', borderRadius: 6, marginBottom: 2,
              textDecoration: 'none', fontSize: 13, fontWeight: 500,
              color: isActive ? 'var(--tx)' : 'var(--tx-3)',
              background: isActive ? 'var(--raised)' : 'transparent',
              borderLeft: `2px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
              transition: 'all 0.12s',
            })}>
              <Icon size={15} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div style={{ padding: '16px 10px', borderTop: '1px solid var(--border)' }}>
          <div style={{ padding: '0 14px 10px', fontSize: 12, color: 'var(--tx-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {auth.email}
          </div>
          <button onClick={toggleTheme} style={{
            display: 'flex', alignItems: 'center', gap: 9, width: '100%',
            padding: '8px 14px', borderRadius: 6, background: 'none', border: 'none',
            color: 'var(--tx-3)', cursor: 'pointer', fontSize: 13,
            transition: 'color 0.12s', marginBottom: 2,
          }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--tx-2)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--tx-3)'}
          >
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
          <button onClick={() => { localStorage.removeItem('clearpath_auth'); navigate('/login') }} style={{
            display: 'flex', alignItems: 'center', gap: 9, width: '100%',
            padding: '8px 14px', borderRadius: 6, background: 'none', border: 'none',
            color: 'var(--tx-3)', cursor: 'pointer', fontSize: 13,
            transition: 'color 0.12s',
          }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--tx-2)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--tx-3)'}
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </aside>

      {/* ── Content ──────────────────────────────── */}
      <main style={{ flex: 1, overflowY: 'auto', animation: 'fadeIn 0.15s ease' }}>
        <Outlet />
      </main>
    </div>
  )
}
