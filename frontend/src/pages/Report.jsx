import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Printer, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react'
import { getCheck } from '../lib/storage'
import ScoreGauge from '../components/ScoreGauge'

const RISK_COLOR = { HIGH: 'var(--red)', MEDIUM: 'var(--amber)', LOW: 'var(--green)' }
const LAYER_NAME = {
  sanctions:    'Sanctions & Watchlists',
  pep:          'PEP Screening',
  adverseMedia: 'Adverse Media',
  corporate:    'Corporate Intelligence',
  crypto:       'Crypto Wallet',
}

export default function Report() {
  const { checkId } = useParams()
  const navigate = useNavigate()
  const [report, setReport] = useState(null)
  const [open, setOpen] = useState({})

  useEffect(() => {
    const r = getCheck(checkId)
    if (r) setReport(r)
  }, [checkId])

  if (!report) return (
    <div style={{ padding: '40px', color: 'var(--tx-3)' }}>
      Report not found.{' '}
      <span style={{ color: 'var(--green)', cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>← Back</span>
    </div>
  )

  const riskColor = RISK_COLOR[report.riskLevel] || 'var(--tx-2)'
  const layers = Object.entries(report.layers || {}).filter(([, v]) => v)
  const toggle = k => setOpen(p => ({ ...p, [k]: !p[k] }))

  return (
    <div>
      {/* Topbar */}
      <div className="no-print" style={{
        position: 'sticky', top: 0, zIndex: 10,
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '0 28px', height: 44,
        background: 'var(--surface)', borderBottom: '1px solid var(--border)',
      }}>
        <button onClick={() => navigate('/dashboard')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--tx-3)', cursor: 'pointer', fontSize: 12, padding: '4px 0' }}>
          <ArrowLeft size={13} /> Dashboard
        </button>
        <span style={{ color: 'var(--border)', fontSize: 16 }}>·</span>
        <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--tx-3)' }}>{report.checkId}</span>
        <div style={{ flex: 1 }} />
        <button onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: '1px solid var(--border)', borderRadius: 5, color: 'var(--tx-3)', cursor: 'pointer', fontSize: 12, padding: '5px 12px' }}>
          <Printer size={12} /> Export PDF
        </button>
      </div>

      <div style={{ padding: '36px 40px', maxWidth: 820 }}>

        {/* Hard stop */}
        {report.hardStop && (
          <div style={{ display: 'flex', gap: 14, padding: '14px 18px', background: 'rgba(255,77,77,0.06)', border: '1px solid rgba(255,77,77,0.25)', borderRadius: 8, marginBottom: 24 }}>
            <AlertTriangle size={18} color="var(--red)" style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--red)', marginBottom: 2 }}>Sanctions hard stop</div>
              <div style={{ fontSize: 12, color: 'var(--tx-2)', lineHeight: 1.6 }}>
                This subject matches a sanctioned entity. Onboarding must not proceed. Escalate to your compliance officer immediately.
              </div>
            </div>
          </div>
        )}

        {/* ── Hero ──────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 40, alignItems: 'flex-start', marginBottom: 32, paddingBottom: 32, borderBottom: '1px solid var(--border)' }}>
          {/* Risk verdict — the money shot */}
          <div style={{ flexShrink: 0, textAlign: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--tx-3)', marginBottom: 8 }}>
              Risk level
            </div>
            <div style={{
              fontSize: 72, fontWeight: 800, lineHeight: 1, color: riskColor,
              letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums',
            }}>
              {report.riskLevel}
            </div>
            <div style={{ marginTop: 12, fontSize: 13, color: 'var(--tx-3)', fontFamily: 'monospace' }}>
              score: <span style={{ color: riskColor, fontWeight: 700 }}>{report.score}</span> / 100
            </div>
          </div>

          {/* Subject meta + score gauge */}
          <div style={{ flex: 1, paddingTop: 4 }}>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--tx)', letterSpacing: '-0.02em', marginBottom: 12 }}>
              {report.subject?.fullName}
            </h1>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 24px', marginBottom: 20 }}>
              {[
                report.subject?.dateOfBirth  && ['Date of birth', report.subject.dateOfBirth, true],
                report.subject?.nationality  && ['Nationality', report.subject.nationality, false],
                report.subject?.walletAddress && ['Wallet', `${report.subject.walletAddress.slice(0, 12)}…`, true],
                ['Screened', new Date(report.createdAt).toLocaleString(), false],
                ['Duration', `${(report.durationMs / 1000).toFixed(1)}s`, true],
              ].filter(Boolean).map(([label, value, mono]) => (
                <div key={label}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--tx-3)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: 13, color: 'var(--tx-2)', fontFamily: mono ? 'monospace' : 'inherit' }}>{value}</div>
                </div>
              ))}
            </div>

            <ScoreGauge score={report.score} riskLevel={report.riskLevel} />

            {report.explanation && (
              <p style={{ marginTop: 14, fontSize: 12, color: 'var(--tx-3)', lineHeight: 1.7 }}>
                {report.explanation}
              </p>
            )}
          </div>
        </div>

        {/* ── Recommendations ──────────────────────────────── */}
        {report.recommendations?.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <h2 style={S.sectionHead}>Recommendations</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {report.recommendations.map((r, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--tx-3)', minWidth: 18, paddingTop: 1, fontFamily: 'monospace' }}>{String(i + 1).padStart(2, '0')}</span>
                  <span style={{ fontSize: 13, color: 'var(--tx-2)', lineHeight: 1.5 }}>{r}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Layer results ─────────────────────────────────── */}
        <div style={{ marginBottom: 28 }}>
          <h2 style={S.sectionHead}>Layer results</h2>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            {/* Header row */}
            <div style={{ display: 'grid', gridTemplateColumns: COLS, padding: '8px 16px', borderBottom: '1px solid var(--border)', fontSize: 10, fontWeight: 600, color: 'var(--tx-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              <span>Layer</span><span>Result</span><span>Score</span><span>Time</span><span />
            </div>
            {layers.map(([key, layer], idx) => {
              const hasIssue = layer.hardStop || layer.pepConfirmed || layer.findingsCount > 0 || layer.disqualifiedDirector || layer.status === 'error'
              const dotColor = layer.status === 'error' ? 'var(--red)' : hasIssue ? 'var(--amber)' : 'var(--green)'
              const isOpen = open[key]
              return (
                <div key={key} style={{ borderBottom: idx < layers.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div
                    onClick={() => toggle(key)}
                    style={{ display: 'grid', gridTemplateColumns: COLS, padding: '11px 16px', cursor: 'pointer', alignItems: 'center', transition: 'background 0.08s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--raised)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500, color: 'var(--tx)' }}>
                      <span style={{ color: dotColor, fontSize: 8 }}>●</span>
                      {LAYER_NAME[key] || key}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--tx-3)' }}>{layer.summary}</span>
                    <span style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 700, color: layer.scoreContribution > 0 ? 'var(--amber)' : 'var(--tx-3)' }}>
                      {layer.scoreContribution > 0 ? `+${layer.scoreContribution}` : '—'}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--tx-3)', fontFamily: 'monospace' }}>{layer.durationMs}ms</span>
                    <span style={{ color: 'var(--tx-3)', display: 'flex', justifyContent: 'flex-end' }}>
                      {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </span>
                  </div>
                  {isOpen && (
                    <div style={{ background: 'var(--bg)', borderTop: '1px solid var(--border)', padding: '14px 16px' }}>
                      <pre style={{ margin: 0, fontSize: 11, color: 'var(--tx-3)', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all', lineHeight: 1.8 }}>
                        {JSON.stringify(layer, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Sources + disclaimer */}
        <div style={{ padding: '14px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, marginBottom: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--tx-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Sources queried</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {(report.meta?.sourcesQueried || []).map(s => (
              <span key={s} style={{ fontSize: 11, color: 'var(--tx-3)', background: 'var(--raised)', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 8px' }}>{s}</span>
            ))}
          </div>
        </div>

        <p style={{ fontSize: 11, color: 'var(--tx-3)', lineHeight: 1.7, opacity: 0.6 }}>
          {report.meta?.disclaimer}
        </p>
      </div>
    </div>
  )
}

const COLS = '200px 1fr 70px 80px 32px'
const S = {
  sectionHead: { fontSize: 12, fontWeight: 600, color: 'var(--tx-3)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 12 },
}
