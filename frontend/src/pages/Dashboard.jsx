import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, AlertCircle, CheckCircle, Search, Clock, TrendingUp } from 'lucide-react'
import { getChecks } from '../lib/storage'
import RiskBadge from '../components/RiskBadge'

export default function Dashboard() {
  const navigate = useNavigate()
  const [checks, setChecks] = useState([])

  useEffect(() => { setChecks(getChecks()) }, [])

  const stats = {
    total: checks.length,
    HIGH: checks.filter(c => c.riskLevel === 'HIGH').length,
    MEDIUM: checks.filter(c => c.riskLevel === 'MEDIUM').length,
    LOW: checks.filter(c => c.riskLevel === 'LOW').length,
  }

  return (
    <div style={{ padding: '36px 40px', maxWidth: '1100px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '32px' }}>
        <div>
          <h1 style={{ color: '#e6edf3', fontSize: '22px', fontWeight: 700, margin: '0 0 4px' }}>Dashboard</h1>
          <p style={{ color: '#7d8590', fontSize: '13px', margin: 0 }}>Overview of recent screening activity</p>
        </div>
        <button onClick={() => navigate('/checks/new')} style={{ ...S.btnPrimary, display: 'flex', alignItems: 'center', gap: '7px', padding: '9px 18px', fontSize: '13px' }}>
          <Search size={14} /> New Check
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '28px' }}>
        <StatCard label="Total Checks" value={stats.total} icon={<TrendingUp size={16} color="#7d8590" />} />
        <StatCard label="High Risk" value={stats.HIGH} valueColor="#ff4d4d" icon={<AlertTriangle size={16} color="#ff4d4d" />} />
        <StatCard label="Medium Risk" value={stats.MEDIUM} valueColor="#ffaa00" icon={<AlertCircle size={16} color="#ffaa00" />} />
        <StatCard label="Low / Clear" value={stats.LOW} valueColor="#00e5a0" icon={<CheckCircle size={16} color="#00e5a0" />} />
      </div>

      <div style={{ backgroundColor: '#0d1117', border: '1px solid #21262d', borderRadius: '10px' }}>
        <div style={{ padding: '16px 22px', borderBottom: '1px solid #21262d', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={14} color="#7d8590" />
          <h2 style={{ color: '#e6edf3', fontSize: '14px', fontWeight: 600, margin: 0 }}>Recent Checks</h2>
        </div>

        {checks.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <Search size={32} color="#21262d" style={{ marginBottom: '12px' }} />
            <p style={{ color: '#7d8590', fontSize: '14px', margin: '0 0 20px' }}>No checks yet. Run your first screening to get started.</p>
            <button onClick={() => navigate('/checks/new')} style={{ ...S.btnPrimary, padding: '9px 20px', fontSize: '13px' }}>
              Run First Check
            </button>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Subject', 'DOB', 'Date Run', 'Layers', 'Score', 'Risk', ''].map(h => (
                  <th key={h} style={{ padding: '11px 20px', textAlign: 'left', color: '#4d5562', fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: '1px solid #21262d' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {checks.map(c => (
                <tr
                  key={c.checkId}
                  onClick={() => navigate(`/checks/${c.checkId}`)}
                  style={{ cursor: 'pointer', borderBottom: '1px solid #161b22' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#161b22'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <td style={{ padding: '13px 20px', color: '#e6edf3', fontSize: '14px', fontWeight: 500 }}>{c.subject?.fullName}</td>
                  <td style={{ padding: '13px 20px', color: '#7d8590', fontSize: '12px', fontFamily: 'monospace' }}>{c.subject?.dateOfBirth || '—'}</td>
                  <td style={{ padding: '13px 20px', color: '#7d8590', fontSize: '12px', fontFamily: 'monospace' }}>{new Date(c.createdAt).toLocaleDateString()}</td>
                  <td style={{ padding: '13px 20px', color: '#4d5562', fontSize: '12px' }}>{c.meta?.layersRun?.length} layers</td>
                  <td style={{ padding: '13px 20px', fontFamily: 'monospace', fontSize: '14px', fontWeight: 700, color: scoreColor(c.riskLevel) }}>{c.score}</td>
                  <td style={{ padding: '13px 20px' }}><RiskBadge level={c.riskLevel} /></td>
                  <td style={{ padding: '13px 20px', color: '#4d5562', fontSize: '12px' }}>View →</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, valueColor = '#e6edf3', icon }) {
  return (
    <div style={{ backgroundColor: '#0d1117', border: '1px solid #21262d', borderRadius: '10px', padding: '20px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <span style={{ color: '#7d8590', fontSize: '12px', fontWeight: 500, letterSpacing: '0.03em' }}>{label}</span>
        {icon}
      </div>
      <div style={{ color: valueColor, fontSize: '34px', fontWeight: 700, fontFamily: 'monospace', lineHeight: 1 }}>{value}</div>
    </div>
  )
}

function scoreColor(level) {
  return { HIGH: '#ff4d4d', MEDIUM: '#ffaa00', LOW: '#00e5a0' }[level] || '#e6edf3'
}

const S = {
  btnPrimary: {
    backgroundColor: '#00e5a0', border: 'none', borderRadius: '7px',
    color: '#080b10', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.03em',
  },
}
