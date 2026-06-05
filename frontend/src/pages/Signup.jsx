import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Sun, Moon } from 'lucide-react'

const PLANS = ['Starter (Free)', 'Professional ($49/mo)', 'Enterprise']

function getTheme() { return localStorage.getItem('cp_theme') || 'dark' }
function setTheme(t) {
  localStorage.setItem('cp_theme', t)
  document.documentElement.setAttribute('data-theme', t)
}

export default function Signup() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [theme, setThemeState] = useState(getTheme)
  const [form, setForm] = useState({
    name: '',
    email: '',
    company: '',
    plan: params.get('plan') || 'Starter (Free)',
    password: '',
    confirmPassword: '',
    terms: false,
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [focused, setFocused] = useState('')

  const set = f => e => setForm(p => ({ ...p, [f]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    setThemeState(next)
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Full name is required.'); return }
    if (!form.email.trim()) { setError('Email address is required.'); return }
    if (!form.password || form.password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match.'); return }
    if (!form.terms) { setError('You must agree to the terms to continue.'); return }
    setLoading(true)
    setTimeout(() => {
      localStorage.setItem('clearpath_auth', JSON.stringify({ email: form.email, name: form.name, company: form.company, plan: form.plan }))
      navigate('/dashboard')
    }, 800)
  }

  const inputStyle = f => ({ ...S.input, borderColor: focused === f ? 'var(--accent)' : 'var(--border)' })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'grid', placeItems: 'center', padding: 24 }}>

      {/* Theme toggle */}
      <button onClick={toggleTheme} style={{ position: 'fixed', top: 20, right: 20, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '7px 10px', cursor: 'pointer', color: 'var(--tx-3)', display: 'flex', alignItems: 'center' }}>
        {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
      </button>

      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 48 }}>
          <svg width={28} height={28} viewBox="0 0 40 40" fill="none">
            <circle cx={20} cy={20} r={19} stroke="var(--accent)" strokeWidth={1.5} />
            <path d="M13 21l5.5 5.5L28 14" stroke="var(--accent)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--tx)', letterSpacing: '-0.02em' }}>ClearPath</span>
        </div>

        {/* Heading */}
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--tx)', letterSpacing: '-0.02em', marginBottom: 6 }}>
          Create your account
        </h1>
        <p style={{ fontSize: 13, color: 'var(--tx-3)', marginBottom: 36 }}>
          Already have one?{' '}
          <Link to="/login" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>Sign in</Link>
        </p>

        {error && (
          <div style={{ fontSize: 12, color: 'var(--red)', marginBottom: 20, padding: '10px 13px', background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)', borderRadius: 6 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={S.label}>Full name <Req /></label>
              <input type="text" value={form.name} onChange={set('name')} placeholder="Jane Smith" autoFocus
                onFocus={() => setFocused('name')} onBlur={() => setFocused('')}
                style={inputStyle('name')} />
            </div>
            <div>
              <label style={S.label}>Company</label>
              <input type="text" value={form.company} onChange={set('company')} placeholder="Acme Financial"
                onFocus={() => setFocused('company')} onBlur={() => setFocused('')}
                style={inputStyle('company')} />
            </div>
          </div>

          <div>
            <label style={S.label}>Email <Req /></label>
            <input type="email" value={form.email} onChange={set('email')} placeholder="you@yourfirm.com"
              onFocus={() => setFocused('email')} onBlur={() => setFocused('')}
              style={inputStyle('email')} />
          </div>

          <div>
            <label style={S.label}>Plan</label>
            <select value={form.plan} onChange={set('plan')} style={{ ...inputStyle('plan'), appearance: 'none' }}>
              {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={S.label}>Password <Req /></label>
              <input type="password" value={form.password} onChange={set('password')} placeholder="Min. 8 characters"
                onFocus={() => setFocused('password')} onBlur={() => setFocused('')}
                style={inputStyle('password')} />
            </div>
            <div>
              <label style={S.label}>Confirm <Req /></label>
              <input type="password" value={form.confirmPassword} onChange={set('confirmPassword')} placeholder="Repeat password"
                onFocus={() => setFocused('confirm')} onBlur={() => setFocused('')}
                style={inputStyle('confirm')} />
            </div>
          </div>

          <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer', marginTop: 2 }}>
            <input type="checkbox" checked={form.terms} onChange={set('terms')} style={{ marginTop: 3, accentColor: 'var(--accent)', flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: 'var(--tx-3)', lineHeight: 1.55 }}>
              I agree to the{' '}
              <span style={{ color: 'var(--accent)', cursor: 'pointer' }}>Terms of Service</span>
              {' '}and{' '}
              <span style={{ color: 'var(--accent)', cursor: 'pointer' }}>Privacy Policy</span>.
              Reports are for compliance decision-support only.
            </span>
          </label>

          <button type="submit" disabled={loading} style={{
            marginTop: 6, width: '100%', padding: '11px',
            background: loading ? 'var(--raised)' : 'var(--accent)',
            border: 'none', borderRadius: 7,
            color: loading ? 'var(--tx-3)' : '#fff',
            fontSize: 13, fontWeight: 700, cursor: loading ? 'wait' : 'pointer',
          }}>
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', color: 'var(--tx-3)', fontSize: 11, marginTop: 32, lineHeight: 1.6, opacity: 0.6 }}>
          Authorised compliance use only. All activity is logged and auditable.
        </p>
      </div>
    </div>
  )
}

function Req() {
  return <span style={{ color: 'var(--red)', marginLeft: 2 }}>*</span>
}

const S = {
  label: {
    display: 'block', fontSize: 11, fontWeight: 600,
    color: 'var(--tx-3)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6,
  },
  input: {
    display: 'block', width: '100%', boxSizing: 'border-box',
    background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 7,
    padding: '10px 13px', color: 'var(--tx)', fontSize: 13, outline: 'none',
    transition: 'border-color 0.15s',
  },
}
