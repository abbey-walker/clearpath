const PALETTE = {
  HIGH:   { color: '#ff4d4d', bg: 'rgba(255,77,77,0.08)',   border: 'rgba(255,77,77,0.2)' },
  MEDIUM: { color: '#ffaa00', bg: 'rgba(255,170,0,0.08)',   border: 'rgba(255,170,0,0.2)' },
  LOW:    { color: '#00e5a0', bg: 'rgba(0,229,160,0.08)',   border: 'rgba(0,229,160,0.2)' },
}

export default function RiskBadge({ level, size = 'sm' }) {
  const p = PALETTE[level] || PALETTE.LOW
  const large = size === 'lg'
  return (
    <span style={{
      display: 'inline-block',
      color: p.color, background: p.bg, border: `1px solid ${p.border}`,
      borderRadius: 4, fontWeight: 700, letterSpacing: '0.07em',
      padding: large ? '4px 12px' : '2px 7px',
      fontSize: large ? 12 : 11,
    }}>
      {level}
    </span>
  )
}
