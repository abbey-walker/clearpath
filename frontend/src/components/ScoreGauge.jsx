export default function ScoreGauge({ score = 0, riskLevel }) {
  const size = 180
  const strokeWidth = 14
  const r = (size - strokeWidth) / 2
  const cx = size / 2
  const cy = size / 2

  // Semi-circle: start = 180deg (left), end = 0deg (right)
  const total = Math.PI * r
  const filled = (score / 100) * total

  const trackColor = '#21262d'
  const fillColor = riskLevel === 'HIGH' ? '#ff4d4d' : riskLevel === 'MEDIUM' ? '#ffaa00' : '#00e5a0'

  return (
    <div style={{ position: 'relative', width: size, height: size / 2 + 20, overflow: 'hidden' }}>
      <svg width={size} height={size} style={{ position: 'absolute', top: 0, left: 0 }}>
        {/* Track */}
        <path
          d={describeArc(cx, cy, r, 180, 0)}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Fill */}
        <path
          d={describeArc(cx, cy, r, 180, 0)}
          fill="none"
          stroke={fillColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${total}`}
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
      </svg>
      <div style={{
        position: 'absolute',
        bottom: '4px',
        left: 0, right: 0,
        textAlign: 'center',
      }}>
        <div style={{ fontFamily: 'monospace', fontSize: '36px', fontWeight: 700, color: fillColor, lineHeight: 1 }}>
          {score}
        </div>
        <div style={{ color: '#7d8590', fontSize: '11px', fontWeight: 500, marginTop: '2px', letterSpacing: '0.06em' }}>
          RISK SCORE
        </div>
      </div>
    </div>
  )
}

function describeArc(cx, cy, r, startDeg, endDeg) {
  const start = polarToCartesian(cx, cy, r, startDeg)
  const end = polarToCartesian(cx, cy, r, endDeg)
  return `M ${start.x} ${start.y} A ${r} ${r} 0 0 1 ${end.x} ${end.y}`
}

function polarToCartesian(cx, cy, r, deg) {
  const rad = (deg * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}
