import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (!email || !password) { setError('Please enter your credentials.'); return }
    localStorage.setItem('clearpath_auth', JSON.stringify({ email }))
    navigate('/dashboard')
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'grid', placeItems: 'center', padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Mark + wordmark */}
        <div style={{ marginBottom: 48, textAlign: 'center' }}>
          <svg width={40} height={40} viewBox="0 0 40 40" fill="none" style={{ marginBottom: 16 }}>
            <circle cx={20} cy={20} r={19} stroke="var(--accent)" strokeWidth={1.5} />
            <path d="M13 21l5.5 5.5L28 14" stroke="var(--accent)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--tx)', letterSpacing: '-0.02em', marginBottom: 4 }}>
            ClearPath
          </div>
          <div style={{ fontSize: 12, color: 'var(--tx-3)', letterSpacing: '0.05em' }}>
            AML / KYC RISK INTELLIGENCE
          </div>
        </div>

        {/* Form card */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '32px 28px' }}>

          {error && (
            <div style={{ fontSize: 12, color: 'var(--red)', marginBottom: 18, padding: '8px 12px', background: 'rgba(255,77,77,0.06)', borderRadius: 5 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={S.label}>Email address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="analyst@yourfirm.com" autoFocus style={S.input} />
            </div>
            <div>
              <label style={S.label}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" style={S.input} />
            </div>
            <button type="submit" style={S.btn}>Sign in →</button>
          </form>
        </div>

        <p style={{ textAlign: 'center', color: 'var(--tx-3)', fontSize: 11, marginTop: 20 }}>
          Authorised users only. All sessions are logged.
        </p>
      </div>
    </div>
  )
}

const S = {
  label: {
    display: 'block', fontSize: 11, fontWeight: 600,
    color: 'var(--tx-3)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6,
  },
  input: {
    display: 'block', width: '100%',
    background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6,
    padding: '9px 11px', color: 'var(--tx)', fontSize: 13, outline: 'none',
  },
  btn: {
    width: '100%', marginTop: 4, padding: '11px',
    background: 'var(--accent)', border: 'none', borderRadius: 7,
    color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
    letterSpacing: '0.02em',
  },
}
