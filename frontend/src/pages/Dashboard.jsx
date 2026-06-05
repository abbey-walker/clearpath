import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { getChecks } from '../lib/storage'
import RiskBadge from '../components/RiskBadge'

const RISK_COLOR = { HIGH: 'var(--red)', MEDIUM: 'var(--amber)', LOW: 'var(--green)' }
const LAYER_ABBR  = { sanctions: 'S', pep: 'P', adverseMedia: 'A', corporate: 'C', crypto: 'K' }

export default function Dashboard() {
  const navigate = useNavigate()
  const [checks, setChecks] = useState([])
  useEffect(() => setChecks(getChecks()), [])

  const total  = checks.length
  const high   = checks.filter(c => c.riskLevel === 'HIGH').length
  const medium = checks.filter(c => c.riskLevel === 'MEDIUM').length
  const low    = checks.filter(c => c.riskLevel === 'LOW').length

  return (
    <div style={{ padding: '36px 40px' }}>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--tx)', letterSpacing: '-0.02em', marginBottom: 3 }}>
            Dashboard
          </h1>
          <p style={{ fontSize: 12, color: 'var(--tx-3)' }}>Risk screening activity</p>
        </div>
        <button onClick={() => navigate('/checks/new')} style={S.primaryBtn}>
          <Plus size={14} strokeWidth={2.5} /> New Check
        </button>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'var(--border)', borderRadius: 8, overflow: 'hidden', marginBottom: 28, border: '1px solid var(--border)' }}>
        {[
          { label: 'Total', value: total, color: 'var(--tx)' },
          { label: 'High risk', value: high, color: 'var(--red)' },
          { label: 'Medium risk', value: medium, color: 'var(--amber)' },
          { label: 'Low / clear', value: low, color: 'var(--green)' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--surface)', padding: '20px 22px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
              {s.label}
            </div>
            <div style={{ fontSize: 36, fontWeight: 700, color: s.color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx)', letterSpacing: '-0.01em' }}>Recent checks</span>
          {total > 0 && <span style={{ fontSize: 11, color: 'var(--tx-3)' }}>{total} total</span>}
        </div>

        {checks.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <p style={{ color: 'var(--tx-3)', marginBottom: 18, fontSize: 13 }}>No checks yet.</p>
            <button onClick={() => navigate('/checks/new')} style={S.primaryBtn}>Run first check</button>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {[['Subject', '30%'], ['DOB', '12%'], ['Layers', '14%'], ['Score', '10%'], ['Risk', '14%'], ['Date', '13%'], ['', '7%']].map(([h, w]) => (
                  <th key={h} style={{ padding: '9px 20px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--tx-3)', letterSpacing: '0.07em', textTransform: 'uppercase', width: w }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {checks.map(c => (
                <tr key={c.checkId}
                  onClick={() => navigate(`/checks/${c.checkId}`)}
                  style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.08s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--raised)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '11px 20px', color: 'var(--tx)', fontWeight: 500, fontSize: 13 }}>{c.subject?.fullName}</td>
                  <td style={{ padding: '11px 20px', color: 'var(--tx-3)', fontSize: 12, fontFamily: 'monospace' }}>{c.subject?.dateOfBirth || '—'}</td>
                  <td style={{ padding: '11px 20px', letterSpacing: '0.12em', fontSize: 11, color: 'var(--tx-3)' }}>
                    {(c.meta?.layersRun || []).map(l => LAYER_ABBR[l] || '?').join(' ')}
                  </td>
                  <td style={{ padding: '11px 20px', fontFamily: 'monospace', fontWeight: 700, fontSize: 13, color: RISK_COLOR[c.riskLevel] }}>{c.score}</td>
                  <td style={{ padding: '11px 20px' }}><RiskBadge level={c.riskLevel} /></td>
                  <td style={{ padding: '11px 20px', color: 'var(--tx-3)', fontSize: 12, fontFamily: 'monospace' }}>{new Date(c.createdAt).toISOString().slice(0, 10)}</td>
                  <td style={{ padding: '11px 20px', color: 'var(--tx-3)', fontSize: 12 }}>View →</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ marginTop: 12, fontSize: 11, color: 'var(--tx-3)' }}>
        Layers — S: sanctions  P: pep  A: adverse media  C: corporate  K: crypto
      </div>
    </div>
  )
}

const S = {
  primaryBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 7,
    padding: '8px 16px', background: 'var(--accent)', border: 'none', borderRadius: 6,
    color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.01em',
  },
}
