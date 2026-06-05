import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AlertTriangle, ChevronDown, ChevronRight, ArrowLeft, Printer, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { getCheck } from '../lib/storage'
import RiskBadge from '../components/RiskBadge'
import ScoreGauge from '../components/ScoreGauge'

const LAYER_META = {
  sanctions:    { label: 'Sanctions & Watchlists' },
  pep:          { label: 'PEP Screening' },
  adverseMedia: { label: 'Adverse Media' },
  corporate:    { label: 'Corporate Intelligence' },
  crypto:       { label: 'Crypto Wallet' },
}

export default function Report() {
  const { checkId } = useParams()
  const navigate = useNavigate()
  const [report, setReport] = useState(null)
  const [expanded, setExpanded] = useState({})

  useEffect(() => {
    const r = getCheck(checkId)
    if (r) { setReport(r); setExpanded({}) }
  }, [checkId])

  if (!report) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: '#7d8590' }}>
        <p>Report not found.</p>
        <button onClick={() => navigate('/dashboard')} style={{ ...S.btnSecondary, marginTop: '16px' }}>← Back to Dashboard</button>
      </div>
    )
  }

  const toggle = key => setExpanded(p => ({ ...p, [key]: !p[key] }))
  const layers = Object.entries(report.layers || {}).filter(([, v]) => v)

  return (
    <div style={{ padding: '36px 40px', maxWidth: '860px' }}>
      {/* Header */}
      <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
        <button onClick={() => navigate('/dashboard')} style={{ ...S.btnSecondary, display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 12px', fontSize: '13px' }}>
          <ArrowLeft size={14} /> Dashboard
        </button>
        <span style={{ color: '#4d5562', fontFamily: 'monospace', fontSize: '12px' }}>{report.checkId}</span>
        <div style={{ marginLeft: 'auto' }}>
          <button onClick={() => window.print()} style={{ ...S.btnSecondary, display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 12px', fontSize: '13px' }}>
            <Printer size={14} /> Export PDF
          </button>
        </div>
      </div>

      {/* Hard stop banner */}
      {report.hardStop && (
        <div style={{
          backgroundColor: 'rgba(255,77,77,0.1)', border: '1px solid rgba(255,77,77,0.4)',
          borderRadius: '10px', padding: '14px 18px', marginBottom: '22px',
          display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          <AlertTriangle size={20} color="#ff4d4d" style={{ flexShrink: 0 }} />
          <div>
            <div style={{ color: '#ff4d4d', fontWeight: 700, fontSize: '14px', marginBottom: '2px' }}>SANCTIONS HARD STOP</div>
            <div style={{ color: '#e6edf3', fontSize: '13px' }}>
              This subject matches a sanctioned entity. Onboarding must not proceed. This case must be escalated immediately to your compliance team.
            </div>
          </div>
        </div>
      )}

      {/* Risk summary card */}
      <div style={{ backgroundColor: '#0d1117', border: '1px solid #21262d', borderRadius: '12px', padding: '28px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '32px' }}>
          <ScoreGauge score={report.score} riskLevel={report.riskLevel} />

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
              <RiskBadge level={report.riskLevel} large />
              <span style={{ color: '#e6edf3', fontSize: '20px', fontWeight: 700 }}>{report.subject?.fullName}</span>
            </div>

            <div style={{ display: 'flex', gap: '20px', marginBottom: '16px', flexWrap: 'wrap' }}>
              {report.subject?.dateOfBirth && <Meta label="DOB" value={report.subject.dateOfBirth} mono />}
              {report.subject?.nationality && <Meta label="Nationality" value={report.subject.nationality} mono />}
              {report.subject?.walletAddress && <Meta label="Wallet" value={`${report.subject.walletAddress.slice(0,10)}…`} mono />}
              <Meta label="Screened" value={new Date(report.createdAt).toLocaleString()} />
              <Meta label="Duration" value={`${(report.durationMs / 1000).toFixed(1)}s`} mono />
            </div>

            <p style={{ color: '#7d8590', fontSize: '13px', margin: '0 0 16px', lineHeight: '1.5' }}>
              {report.explanation}
            </p>

            {/* Score breakdown bar */}
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
              {(report.scoreBreakdown || []).filter(b => b.contribution > 0).map(b => (
                <span key={b.layer} style={{
                  backgroundColor: '#161b22', border: '1px solid #21262d',
                  borderRadius: '5px', padding: '3px 8px',
                  fontSize: '12px', color: '#e6edf3', fontFamily: 'monospace',
                }}>
                  {b.layer} +{b.contribution}
                </span>
              ))}
              {(report.scoreBreakdown || []).every(b => !b.contribution) && (
                <span style={{ color: '#4d5562', fontSize: '12px' }}>No risk signals detected</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {report.recommendations?.length > 0 && (
        <div style={{ backgroundColor: '#0d1117', border: '1px solid #21262d', borderRadius: '10px', padding: '20px 24px', marginBottom: '20px' }}>
          <h2 style={{ color: '#e6edf3', fontSize: '14px', fontWeight: 600, margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle size={15} color="#00e5a0" /> Recommendations
          </h2>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {report.recommendations.map((r, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', color: '#e6edf3' }}>
                <span style={{ color: '#00e5a0', marginTop: '1px', flexShrink: 0 }}>›</span>
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Layer results */}
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ color: '#e6edf3', fontSize: '14px', fontWeight: 600, margin: '0 0 12px' }}>Layer Results</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {layers.map(([key, layer]) => (
            <LayerCard key={key} layerKey={key} layer={layer} expanded={expanded[key]} onToggle={() => toggle(key)} />
          ))}
        </div>
      </div>

      {/* Sources */}
      <div style={{ backgroundColor: '#0d1117', border: '1px solid #21262d', borderRadius: '10px', padding: '16px 20px', marginBottom: '20px' }}>
        <h3 style={{ color: '#7d8590', fontSize: '12px', fontWeight: 600, margin: '0 0 10px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Sources Queried</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {(report.meta?.sourcesQueried || []).map(s => (
            <span key={s} style={{ backgroundColor: '#161b22', border: '1px solid #21262d', borderRadius: '4px', padding: '3px 8px', fontSize: '11px', color: '#7d8590' }}>{s}</span>
          ))}
        </div>
      </div>

      {/* Disclaimer */}
      <p style={{ color: '#4d5562', fontSize: '11px', lineHeight: '1.6', margin: 0 }}>
        {report.meta?.disclaimer}
      </p>
    </div>
  )
}

function LayerCard({ layerKey, layer, expanded, onToggle }) {
  const meta = LAYER_META[layerKey] || { label: layerKey }
  const hasFindings = layer.status === 'error' || layer.hardStop || layer.pepConfirmed || (layer.findingsCount > 0) || layer.disqualifiedDirector

  const statusIcon = layer.status === 'error'
    ? <XCircle size={14} color="#ff4d4d" />
    : hasFindings
      ? <AlertCircle size={14} color="#ffaa00" />
      : <CheckCircle size={14} color="#00e5a0" />

  return (
    <div style={{ backgroundColor: '#0d1117', border: '1px solid #21262d', borderRadius: '8px', overflow: 'hidden' }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px', background: 'none', border: 'none', cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {statusIcon}
          <span style={{ color: '#e6edf3', fontSize: '13px', fontWeight: 600 }}>{meta.label}</span>
          <span style={{ color: '#4d5562', fontSize: '12px' }}>— {layer.summary}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {layer.scoreContribution > 0 && (
            <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#ffaa00' }}>+{layer.scoreContribution}</span>
          )}
          <span style={{ color: '#7d8590', fontSize: '11px', fontFamily: 'monospace' }}>{layer.durationMs}ms</span>
          {expanded ? <ChevronDown size={14} color="#7d8590" /> : <ChevronRight size={14} color="#7d8590" />}
        </div>
      </button>

      {expanded && (
        <div style={{ borderTop: '1px solid #21262d', padding: '16px 18px', backgroundColor: '#080b10' }}>
          <pre style={{ margin: 0, fontFamily: 'monospace', fontSize: '11px', color: '#7d8590', whiteSpace: 'pre-wrap', wordBreak: 'break-all', lineHeight: '1.6' }}>
            {JSON.stringify(layer, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

function Meta({ label, value, mono = false }) {
  return (
    <div>
      <div style={{ color: '#4d5562', fontSize: '11px', fontWeight: 500, marginBottom: '1px', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ color: '#7d8590', fontSize: '12px', fontFamily: mono ? 'monospace' : 'inherit' }}>{value}</div>
    </div>
  )
}

const S = {
  btnSecondary: {
    backgroundColor: '#161b22', border: '1px solid #21262d', borderRadius: '6px',
    color: '#7d8590', cursor: 'pointer', fontWeight: 500,
  },
}
