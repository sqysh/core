export function SqywheelOfFurtuneButton({ launchGame, launching }) {
  return (
    <button
      onClick={launchGame}
      disabled={launching}
      aria-label="Launch Sqywheel of Fortune"
      className="group relative flex-1 h-11 sm:h-12 px-3 sm:px-6 inline-flex items-center justify-center overflow-hidden whitespace-nowrap border border-amber-300/60 disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-dark"
      style={{
        background: 'radial-gradient(120% 160% at 50% 0%, #1e4fa3 0%, #0a2a6b 55%, #041845 100%)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25), 0 2px 10px rgba(4,24,69,0.5)'
      }}
    >
      <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
        {['#a855f7', '#ec4899', '#84cc16', '#facc15', '#f97316', '#22d3ee'].map((color, i) => {
          const startAngle = (i * 60 - 90) * (Math.PI / 180)
          const endAngle = ((i + 1) * 60 - 90) * (Math.PI / 180)
          const r = 14
          const cx = 16
          const cy = 16
          const x1 = cx + r * Math.cos(startAngle)
          const y1 = cy + r * Math.sin(startAngle)
          const x2 = cx + r * Math.cos(endAngle)
          const y2 = cy + r * Math.sin(endAngle)
          return (
            <path
              key={i}
              d={`M ${cx} ${cy} L ${x1.toFixed(3)} ${y1.toFixed(3)} A ${r} ${r} 0 0 1 ${x2.toFixed(3)} ${y2.toFixed(3)} Z`}
              fill={color}
            />
          )
        })}
        {/* Dividing lines */}
        {Array.from({ length: 6 }).map((_, i) => {
          const angle = (i * 60 - 90) * (Math.PI / 180)
          return (
            <line
              key={i}
              x1="16"
              y1="16"
              x2={(16 + 14 * Math.cos(angle)).toFixed(3)}
              y2={(16 + 14 * Math.sin(angle)).toFixed(3)}
              stroke="rgba(4,24,69,0.5)"
              strokeWidth="0.8"
            />
          )
        })}
        {/* Outer ring */}
        <circle cx="16" cy="16" r="14" fill="none" stroke="rgba(255,213,74,0.4)" strokeWidth="1" />
        {/* Center hub */}
        <circle cx="16" cy="16" r="2.5" fill="#041845" stroke="#FFD54A" strokeWidth="0.8" />
      </svg>
    </button>
  )
}
