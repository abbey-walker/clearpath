import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'

const PLANS = ['Starter (Free)', 'Professional ($49/mo)', 'Enterprise']

export default function Signup() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
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

  const set = f => e => setForm(p => ({ ...p, [f]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Full name is required.'); return }
    if (!form.email.trim()) { setError('Email address is required.'); return }
    if (!form.password || form.password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match.'); return }
    if (!form.terms) { setError('You must agree to the terms of service.'); return }

    setLoading(true)
    // Simulate account creation - in production this would call the API
    setTimeout(() => {
      localStorage.setItem('clearpath_auth', JSON.stringify({
        email: form.email,
        name: form.name,
        company: form.company,
        plan: form.plan,
      }))
      navigate('/dashboard')
    }, 800)
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'grid', placeItems: 'center', padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 460 }}>

        {/* Logo */}
        <div style={{ marginBottom: 36, textAlign: 'center' }}>
          <svg width={36} height={36} viewBox="0 0 40 40" fill="none" style={{ marginBottom: 14 }}>
            <circle cx={20} cy={20} r={19} stroke="var(--accent)" strokeWidth={1.5} />
            <path d="M13 21l5.5 5.5L28 14" stroke="var(--accent)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--tx)', letterSpacing: '-0.02em', marginBottom: 3 }}>
            Create your account
          </div>
          <div style={{ fontSize: 12, color: 'var(--tx-3)' }}>
            Already have one?{' '}
            <Link to="/login" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Sign in</Link>
          </div>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '28px 28px' }}>

          {error && (
            <div style={{ fontSize: 12, color: 'var(--red)', marginBottom: 18, padding: '8px 12px', background: 'rgba(255,77,77,0.06)', border: '1px solid rgba(255,77,77,0.15)', borderRadius: 5 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={S.label}>Full name <Req /></label>
                <input type="text" value={form.name} onChange={set('name')} placeholder="Jane Smith" autoFocus style={S.input} required />
              </div>
              <div>
                <label style={S.label}>Company / firm</label>
                <input type="text" value={form.company} onChange={set('company')} placeholder="Acme Financial" style={S.input} />
              </div>
            </div>

            <div>
              <label style={S.label}>Email address <Req /></label>
              <input type="email" value={form.email} onChange={set('email')} placeholder="jane@yourfirm.com.au" style={S.input} required />
            </div>

            <div>
              <label style={S.label}>Plan</label>
              <select value={form.plan} onChange={set('plan')} style={{ ...S.input, appearance: 'none' }}>
                {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={S.label}>Password <Req /></label>
                <input type="password" value={form.password} onChange={set('password')} placeholder="Min. 8 characters" style={S.input} required />
              </div>
              <div>
                <label style={S.label}>Confirm password <Req /></label>
                <input type="password" value={form.confirmPassword} onChange={set('confirmPassword')} placeholder="Repeat password" style={S.input} required />
              </div>
            </div>

            <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer', marginTop: 4 }}>
              <input type="checkbox" checked={form.terms} onChange={set('terms')} style={{ marginTop: 2, accentColor: 'var(--accent)', flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: 'var(--tx-3)', lineHeight: 1.5 }}>
                I agree to the{' '}
                <span style={{ color: 'var(--accent)', cursor: 'pointer' }}>Terms of Service</span>
                {' '}and{' '}
                <span style={{ color: 'var(--accent)', cursor: 'pointer' }}>Privacy Policy</span>.
                Reports generated are for compliance decision-support only.
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
        </div>

        <p style={{ textAlign: 'center', color: 'var(--tx-3)', fontSize: 11, marginTop: 18, lineHeight: 1.6 }}>
          ClearPath is for authorised compliance use only. All activity is logged and auditable.
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
    color: 'var(--tx-3)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6,
  },
  input: {
    display: 'block', width: '100%',
    background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6,
    padding: '9px 11px', color: 'var(--tx)', fontSize: 13, outline: 'none', boxSizing: 'border-box',
  },
}
