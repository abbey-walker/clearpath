import { useNavigate } from 'react-router-dom'
import { ShieldAlert, UserCheck, Newspaper, Building2, Link2 } from 'lucide-react'

const FEATURES = [
  {
    Icon: ShieldAlert,
    title: 'Sanctions & Watchlists',
    body: 'Screens against OFAC, UN, EU, HMT, and 40+ international sanctions and watchlists in real time.',
    tag: '40+ lists',
  },
  {
    Icon: UserCheck,
    title: 'PEP Detection',
    body: 'Identifies politically exposed persons using Wikidata and OpenSanctions, with full position history and tier classification.',
    tag: 'Wikidata + OpenSanctions',
  },
  {
    Icon: Newspaper,
    title: 'Adverse Media',
    body: 'Searches GDELT, NewsAPI, Google CSE, FCA enforcement, SEC EDGAR, and insolvency registers for negative coverage.',
    tag: 'News + regulators',
  },
  {
    Icon: Building2,
    title: 'Corporate Intelligence',
    body: 'Surfaces directorships, company affiliations, and high-risk jurisdiction exposure via Companies House and OpenCorporates.',
    tag: 'Companies House',
  },
  {
    Icon: Link2,
    title: 'Crypto Wallet Risk',
    body: 'Analyses on-chain transaction history for exposure to mixers, sanctioned addresses, and darknet activity.',
    tag: 'On-chain analysis',
  },
]

const STEPS = [
  { n: '01', title: 'Enter subject details', body: 'Name, date of birth, nationality. More context means more accurate results.' },
  { n: '02', title: 'Choose screening layers', body: 'Select which data sources to query. Sanctions is always included - the rest are configurable.' },
  { n: '03', title: 'Get a full risk report', body: 'A risk level, composite score, and analyst-ready summary with clear reasoning behind every finding.' },
]

const PLANS = [
  {
    name: 'Starter',
    price: 'Free',
    sub: 'No credit card required',
    features: [
      '10 checks per month',
      'Sanctions + PEP screening',
      'Basic risk report',
      '30-day check history',
      'Email support',
    ],
    cta: 'Start for free',
    highlight: false,
  },
  {
    name: 'Professional',
    price: '$49',
    sub: 'per month, billed monthly',
    features: [
      'Unlimited checks',
      'All 5 screening layers',
      'Adverse media - news + regulators',
      'Corporate intelligence',
      'PDF export + copy summary',
      'Full check history',
      'Priority support',
    ],
    cta: 'Start 14-day trial',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    sub: 'tailored to your team',
    features: [
      'Everything in Professional',
      'API access for integrations',
      'Custom data source connections',
      'White-label reporting',
      'Dedicated account manager',
      'SLA and compliance docs',
    ],
    cta: 'Contact us',
    highlight: false,
  },
]

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', color: 'var(--tx)' }}>

      {/* Nav */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', padding: '0 48px', height: 56,
        background: 'rgba(11,14,20,0.92)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
          <svg width={24} height={24} viewBox="0 0 40 40" fill="none">
            <circle cx={20} cy={20} r={19} stroke="var(--accent)" strokeWidth={1.5} />
            <path d="M13 21l5.5 5.5L28 14" stroke="var(--accent)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em' }}>ClearPath</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => navigate('/login')} style={NS.ghostBtn}>Log in</button>
          <button onClick={() => navigate('/signup')} style={NS.accentBtn}>Sign up free</button>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ maxWidth: 860, margin: '0 auto', padding: '96px 48px 80px', textAlign: 'center' }}>
        <div style={{
          display: 'inline-block', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em',
          textTransform: 'uppercase', color: 'var(--accent)',
          background: 'rgba(123,104,238,0.1)', border: '1px solid rgba(123,104,238,0.25)',
          borderRadius: 20, padding: '4px 14px', marginBottom: 28,
        }}>
          AML / KYC Risk Intelligence
        </div>
        <h1 style={{
          fontSize: 56, fontWeight: 800, lineHeight: 1.08, letterSpacing: '-0.03em',
          color: 'var(--tx)', marginBottom: 24,
        }}>
          Know exactly who you are<br />
          <span style={{ color: 'var(--accent)' }}>onboarding</span>
        </h1>
        <p style={{
          fontSize: 18, color: 'var(--tx-2)', lineHeight: 1.7, maxWidth: 600,
          margin: '0 auto 40px',
        }}>
          Run sanctions checks, PEP screening, and adverse media searches against
          40+ global data sources in seconds. Get analyst-ready reports with a
          clear risk rating and reasoning behind every finding.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/signup')} style={{ ...NS.accentBtn, fontSize: 14, padding: '12px 28px', borderRadius: 8 }}>
            Start screening for free
          </button>
          <button onClick={() => navigate('/login')} style={{ ...NS.ghostBtn, fontSize: 14, padding: '12px 28px', borderRadius: 8 }}>
            Sign in to your account
          </button>
        </div>
      </section>

      {/* Trust bar */}
      <div style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '16px 48px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexWrap: 'wrap', gap: '8px 32px', justifyContent: 'center', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--tx-3)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Data sources include</span>
          {['OpenSanctions', 'Wikidata', 'GDELT Global News', 'Google CSE', 'FCA Register', 'SEC EDGAR', 'AUSTRAC', 'ASIC', 'Companies House'].map(s => (
            <span key={s} style={{ fontSize: 12, color: 'var(--tx-3)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4, padding: '3px 10px' }}>{s}</span>
          ))}
        </div>
      </div>

      {/* Features */}
      <section style={{ maxWidth: 900, margin: '0 auto', padding: '80px 48px' }}>
        <div style={{ marginBottom: 44 }}>
          <h2 style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 10 }}>
            Screening layers
          </h2>
          <p style={{ fontSize: 15, color: 'var(--tx-3)', maxWidth: 480 }}>
            Five independent data layers. Run them together or pick what fits your workflow.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: 'var(--border)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          {FEATURES.map(({ Icon, title, body, tag }, i) => (
            <div key={title} style={{
              background: 'var(--surface)', padding: '24px 26px',
              display: 'flex', gap: 18, alignItems: 'flex-start',
              transition: 'background 0.12s',
              ...(i === FEATURES.length - 1 && FEATURES.length % 2 !== 0 ? { gridColumn: 'span 2' } : {}),
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--raised)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--surface)'}
            >
              <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(123,104,238,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={16} color="var(--accent)" strokeWidth={1.75} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--tx)' }}>{title}</span>
                  <span style={{ fontSize: 10, color: 'var(--tx-3)', background: 'var(--raised)', border: '1px solid var(--border)', borderRadius: 3, padding: '1px 6px', whiteSpace: 'nowrap' }}>{tag}</span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--tx-3)', lineHeight: 1.65, margin: 0 }}>{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '80px 48px' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <h2 style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 12 }}>
              How it works
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 32 }}>
            {STEPS.map(s => (
              <div key={s.n}>
                <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--accent)', fontVariantNumeric: 'tabular-nums', marginBottom: 14, fontFamily: 'monospace' }}>{s.n}</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--tx)', marginBottom: 8 }}>{s.title}</div>
                <div style={{ fontSize: 13, color: 'var(--tx-3)', lineHeight: 1.65 }}>{s.body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section style={{ maxWidth: 960, margin: '0 auto', padding: '80px 48px' }}>
        <div style={{ textAlign: 'center', marginBottom: 52 }}>
          <h2 style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 12 }}>
            Simple, transparent pricing
          </h2>
          <p style={{ fontSize: 15, color: 'var(--tx-3)' }}>Start free. Scale as your team grows.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {PLANS.map(p => (
            <div key={p.name} style={{
              background: p.highlight ? 'rgba(123,104,238,0.05)' : 'var(--surface)',
              border: `1px solid ${p.highlight ? 'rgba(123,104,238,0.4)' : 'var(--border)'}`,
              borderRadius: 12, padding: '28px 24px',
              display: 'flex', flexDirection: 'column',
            }}>
              {p.highlight && (
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 12 }}>Most popular</div>
              )}
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--tx)', marginBottom: 4 }}>{p.name}</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--tx)', letterSpacing: '-0.02em', marginBottom: 2 }}>{p.price}</div>
              <div style={{ fontSize: 12, color: 'var(--tx-3)', marginBottom: 24 }}>{p.sub}</div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 24 }}>
                {p.features.map(f => (
                  <div key={f} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{ color: 'var(--accent)', marginTop: 2, flexShrink: 0 }}>✓</span>
                    <span style={{ fontSize: 13, color: 'var(--tx-2)', lineHeight: 1.4 }}>{f}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => navigate(p.name === 'Enterprise' ? '/contact' : '/signup')}
                style={{
                  width: '100%', padding: '11px', borderRadius: 7, border: p.highlight ? 'none' : '1px solid var(--border)',
                  background: p.highlight ? 'var(--accent)' : 'transparent',
                  color: p.highlight ? '#fff' : 'var(--tx-2)',
                  fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}
              >
                {p.cta}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 600, margin: '0 auto', padding: '80px 48px', textAlign: 'center' }}>
          <h2 style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 16 }}>
            Start screening in minutes
          </h2>
          <p style={{ fontSize: 15, color: 'var(--tx-3)', marginBottom: 32, lineHeight: 1.6 }}>
            No setup required. No data to install. Connect your API keys, enter a name, and get a full risk report.
          </p>
          <button onClick={() => navigate('/signup')} style={{ ...NS.accentBtn, fontSize: 14, padding: '12px 32px', borderRadius: 8 }}>
            Create your free account
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border)', padding: '24px 48px' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width={18} height={18} viewBox="0 0 40 40" fill="none">
              <circle cx={20} cy={20} r={19} stroke="var(--accent)" strokeWidth={1.5} />
              <path d="M13 21l5.5 5.5L28 14" stroke="var(--accent)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx-3)' }}>ClearPath</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--tx-3)' }}>
            AML / KYC screening platform. Reports are for decision support only and do not constitute legal or compliance advice.
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            {['Privacy', 'Terms', 'Contact'].map(l => (
              <span key={l} style={{ fontSize: 12, color: 'var(--tx-3)', cursor: 'pointer' }}>{l}</span>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}

const NS = {
  ghostBtn: {
    background: 'none', border: '1px solid var(--border)', borderRadius: 6,
    color: 'var(--tx-2)', fontSize: 13, fontWeight: 500, cursor: 'pointer', padding: '7px 16px',
  },
  accentBtn: {
    background: 'var(--accent)', border: 'none', borderRadius: 6,
    color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', padding: '7px 16px',
  },
}
