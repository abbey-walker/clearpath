const MAP = {
  HIGH:   { color: '#ff4d4d', bg: 'rgba(255,77,77,0.1)',   border: 'rgba(255,77,77,0.3)' },
  MEDIUM: { color: '#ffaa00', bg: 'rgba(255,170,0,0.1)',   border: 'rgba(255,170,0,0.3)' },
  LOW:    { color: '#00e5a0', bg: 'rgba(0,229,160,0.1)',   border: 'rgba(0,229,160,0.3)' },
}

export default function RiskBadge({ level, large = false }) {
  const s = MAP[level] || MAP.LOW
  return (
    <span style={{
      backgroundColor: s.bg,
      border: `1px solid ${s.border}`,
      color: s.color,
      borderRadius: large ? '8px' : '5px',
      padding: large ? '6px 16px' : '3px 8px',
      fontSize: large ? '13px' : '11px',
      fontWeight: 700,
      fontFamily: 'monospace',
      letterSpacing: '0.1em',
      display: 'inline-block',
    }}>
      {level}
    </span>
  )
}
