const COLOR = { HIGH: '#ff4d4d', MEDIUM: '#ffaa00', LOW: '#00e5a0' }

export default function ScoreGauge({ score = 0, riskLevel }) {
  const color = COLOR[riskLevel] || '#00e5a0'
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--tx-3)', textTransform: 'uppercase' }}>Risk Score</span>
        <span style={{ fontSize: 11, color: 'var(--tx-3)' }}>/100</span>
      </div>
      <div style={{ position: 'relative', height: 5, background: 'var(--raised)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: '0 auto 0 0', width: `${score}%`, background: color, borderRadius: 2, transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 10, color: 'var(--tx-3)' }}>
        {[0, 25, 50, 75, 100].map(n => <span key={n}>{n}</span>)}
      </div>
    </div>
  )
}
