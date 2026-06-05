import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield } from 'lucide-react'

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
      minHeight: '100vh', backgroundColor: '#080b10',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>

        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '56px', height: '56px', borderRadius: '14px',
            backgroundColor: 'rgba(0,229,160,0.1)',
            border: '1px solid rgba(0,229,160,0.2)',
            marginBottom: '16px',
          }}>
            <Shield size={26} color="#00e5a0" />
          </div>
          <h1 style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '22px', letterSpacing: '0.1em', color: '#e6edf3', margin: '0 0 6px' }}>
            CLEARPATH
          </h1>
          <p style={{ color: '#7d8590', fontSize: '13px', margin: 0 }}>AML / KYC Risk Intelligence Platform</p>
        </div>

        <div style={{ backgroundColor: '#0d1117', border: '1px solid #21262d', borderRadius: '12px', padding: '32px' }}>
          <h2 style={{ color: '#e6edf3', fontSize: '17px', fontWeight: 600, margin: '0 0 22px' }}>Sign in to your account</h2>

          {error && (
            <div style={{ backgroundColor: 'rgba(255,77,77,0.08)', border: '1px solid rgba(255,77,77,0.25)', borderRadius: '6px', padding: '10px 12px', color: '#ff4d4d', fontSize: '13px', marginBottom: '16px' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <label style={S.label}>Email address</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="analyst@yourfirm.com" style={{ ...S.input, marginBottom: '14px' }} />

            <label style={S.label}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={{ ...S.input, marginBottom: '22px' }} />

            <button type="submit" style={S.btn}>Sign in</button>
          </form>
        </div>

        <p style={{ textAlign: 'center', color: '#4d5562', fontSize: '12px', marginTop: '20px' }}>
          Authorised users only. All activity is logged and audited.
        </p>
      </div>
    </div>
  )
}

const S = {
  label: { display: 'block', color: '#7d8590', fontSize: '12px', fontWeight: 500, marginBottom: '6px', letterSpacing: '0.03em' },
  input: {
    width: '100%', backgroundColor: '#080b10', border: '1px solid #21262d',
    borderRadius: '6px', padding: '10px 12px', color: '#e6edf3', fontSize: '14px',
    outline: 'none', boxSizing: 'border-box', display: 'block',
  },
  btn: {
    width: '100%', backgroundColor: '#00e5a0', border: 'none', borderRadius: '7px',
    padding: '12px', color: '#080b10', fontSize: '14px', fontWeight: 700,
    cursor: 'pointer', letterSpacing: '0.04em',
  },
}
