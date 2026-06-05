import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [focused, setFocused] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (!email || !password) { setError('Please enter your email and password.'); return }
    localStorage.setItem('clearpath_auth', JSON.stringify({ email }))
    navigate('/dashboard')
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'grid', placeItems: 'center', padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 380 }}>

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
          Sign in
        </h1>
        <p style={{ fontSize: 13, color: 'var(--tx-3)', marginBottom: 36 }}>
          Don't have an account?{' '}
          <span onClick={() => navigate('/signup')} style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 500 }}>
            Create one free
          </span>
        </p>

        {error && (
          <div style={{ fontSize: 12, color: 'var(--red)', marginBottom: 20, padding: '10px 13px', background: 'rgba(255,77,77,0.06)', border: '1px solid rgba(255,77,77,0.15)', borderRadius: 6 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={S.label}>Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@yourfirm.com" autoFocus
              onFocus={() => setFocused('email')} onBlur={() => setFocused('')}
              style={{ ...S.input, borderColor: focused === 'email' ? 'var(--accent)' : 'var(--border)' }}
            />
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
              <label style={S.label}>Password</label>
              <span style={{ fontSize: 11, color: 'var(--tx-3)', cursor: 'pointer' }}>Forgot password?</span>
            </div>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              onFocus={() => setFocused('password')} onBlur={() => setFocused('')}
              style={{ ...S.input, borderColor: focused === 'password' ? 'var(--accent)' : 'var(--border)' }}
            />
          </div>
          <button type="submit" style={S.btn}>Sign in</button>
        </form>

        <p style={{ textAlign: 'center', color: 'var(--tx-3)', fontSize: 11, marginTop: 32, lineHeight: 1.6, opacity: 0.6 }}>
          Authorised users only. All activity is logged.
        </p>
      </div>
    </div>
  )
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
  btn: {
    width: '100%', marginTop: 6, padding: '11px',
    background: 'var(--accent)', border: 'none', borderRadius: 7,
    color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
    letterSpacing: '0.01em',
  },
}
