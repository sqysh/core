import { EXTEND_H, HORIZON_Y, SCENE_H, SCENE_W, SHORE } from '../../_lib/harborMap'

const SEA_H = SCENE_H + EXTEND_H
import { isWater, lengthAt } from '../../_lib/harborLayout'
import { seeded } from '../../_lib/random'

// Movement for the illustration's sea, drawn over it and masked to the water so nothing spills onto the island.
// Bands nearer the viewer are taller and faster than those out by the horizon, which gives the water its depth.

const SWELLS = [
  { y: 930, amp: 2, period: 220, seconds: 70, stroke: 2, opacity: 0.45, dash: '60 140' },
  { y: 958, amp: 3, period: 300, seconds: 58, stroke: 2.5, opacity: 0.45, dash: '90 170' },
  { y: 995, amp: 5, period: 380, seconds: 46, stroke: 3, opacity: 0.4, dash: '130 210' },
  { y: 1045, amp: 7, period: 480, seconds: 38, stroke: 4, opacity: 0.38, dash: '170 260' },
  { y: 1110, amp: 10, period: 600, seconds: 31, stroke: 5, opacity: 0.35, dash: '220 320' },
  { y: 1185, amp: 13, period: 760, seconds: 26, stroke: 6, opacity: 0.32, dash: '280 380' },
  { y: 1255, amp: 16, period: 900, seconds: 22, stroke: 7, opacity: 0.3, dash: '340 420' },
  { y: 1335, amp: 19, period: 1050, seconds: 19, stroke: 8, opacity: 0.28, dash: '400 480' },
  { y: 1430, amp: 22, period: 1200, seconds: 17, stroke: 9, opacity: 0.26, dash: '460 540' },
  { y: 1540, amp: 25, period: 1350, seconds: 15, stroke: 10, opacity: 0.24, dash: '520 600' },
  { y: 1665, amp: 28, period: 1500, seconds: 14, stroke: 11, opacity: 0.22, dash: '580 660' },
  { y: 1800, amp: 30, period: 1650, seconds: 13, stroke: 12, opacity: 0.2, dash: '640 720' }
]

function crestPath(amp: number, period: number, width: number) {
  let d = `M0 ${amp}`
  for (let x = 0; x < width; x += period) d += ` Q${x + period / 4} 0 ${x + period / 2} ${amp} T${x + period} ${amp}`
  return d
}

// Sparkles, whitecaps and reflection streaks scattered over open water; seeded so every screen draws the same sea
const rand = seeded(7)
function scatter(n: number, yMin: number, yMax: number) {
  const out: { x: number; y: number; s: number; d: number; t: number }[] = []
  for (let tries = 0; out.length < n && tries < n * 40; tries++) {
    const x = rand() * SCENE_W
    const y = yMin + Math.pow(rand(), 0.8) * (yMax - yMin)
    if (!isWater(x, y)) continue
    // whole and hundredth values keep the server and browser renders identical
    out.push({
      x: Math.round(x),
      y: Math.round(y),
      s: Math.round(Math.max(0.25, lengthAt(y) / 200) * 100) / 100,
      d: Math.round(rand() * 100) / 100,
      t: Math.round(rand() * 100) / 100
    })
  }
  return out
}

const GLINTS = scatter(130, HORIZON_Y + 6, SEA_H - 6)
const CAPS = scatter(40, HORIZON_Y + 30, SEA_H - 10)

export function Water() {
  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{
        maskImage: 'url(/images/harbor/water-mask.png)',
        maskSize: '100% 100%',
        WebkitMaskImage: 'url(/images/harbor/water-mask.png)',
        WebkitMaskSize: '100% 100%'
      }}
      aria-hidden="true"
    >
      {/* Haze breathing on the horizon */}
      <div
        className="harbor-haze absolute inset-x-0"
        style={{
          top: HORIZON_Y - 10,
          height: 70,
          background: 'linear-gradient(to bottom, rgba(255,255,255,0.55), rgba(255,255,255,0))'
        }}
      />

      {/* Rolling swell lines, each band at its own speed */}
      {SWELLS.map((s, i) => (
        <svg
          key={i}
          className="harbor-swell absolute left-0"
          width={SCENE_W + s.period * 2}
          height={s.amp * 2 + s.stroke * 2}
          style={
            {
              top: s.y - s.amp,
              left: -s.period * 2,
              animationDuration: `${s.seconds}s`,
              '--shift': `${s.period * 2}px`
            } as React.CSSProperties
          }
        >
          <path
            d={crestPath(s.amp, s.period, SCENE_W + s.period * 2)}
            transform={`translate(0 ${s.stroke})`}
            fill="none"
            stroke="#bff0ff"
            strokeWidth={s.stroke}
            strokeLinecap="round"
            strokeDasharray={s.dash}
            opacity={s.opacity}
          />
          <path
            d={crestPath(s.amp, s.period, SCENE_W + s.period * 2)}
            transform={`translate(${s.period * 0.37} ${s.stroke + s.amp * 0.8})`}
            fill="none"
            stroke="#ffffff"
            strokeWidth={s.stroke * 0.6}
            strokeLinecap="round"
            strokeDasharray={s.dash}
            opacity={s.opacity * 0.8}
          />
        </svg>
      ))}

      {/* A broad band of sunlight drifting slowly across the water */}
      <div
        className="harbor-sweep absolute"
        style={{
          left: SCENE_W * 0.3,
          top: HORIZON_Y,
          width: 700,
          height: SEA_H - HORIZON_Y,
          background: 'linear-gradient(to right, rgba(255,255,255,0), rgba(220,248,255,0.16), rgba(255,255,255,0))',
          mixBlendMode: 'screen'
        }}
      />

      {/* Whitecaps forming and spilling */}
      <svg className="absolute inset-0" width={SCENE_W} height={SEA_H}>
        {CAPS.map((c, i) => (
          <path
            key={i}
            className="harbor-cap"
            style={{ animationDuration: `${7 + c.t * 6}s`, animationDelay: `${-c.d * 13}s` }}
            d={`M${c.x - 40 * c.s} ${c.y} Q${c.x - 10 * c.s} ${c.y - 12 * c.s} ${c.x + 30 * c.s} ${c.y - 2 * c.s} Q${c.x + 4 * c.s} ${c.y - 4 * c.s} ${c.x - 40 * c.s} ${c.y} Z`}
            fill="#ffffff"
          />
        ))}

        {/* Foam lapping where the island meets the sea */}
        <polyline
          points={SHORE}
          className="harbor-lap"
          fill="none"
          stroke="#ffffff"
          strokeWidth="8"
          strokeOpacity="0.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <polyline
          points={SHORE}
          className="harbor-lap"
          style={{ animationDelay: '-2.7s' }}
          fill="none"
          stroke="#dff7ff"
          strokeWidth="4"
          strokeOpacity="0.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="140 60"
          transform="translate(0 9)"
        />
      </svg>

      {/* Sun glints */}
      {GLINTS.map((g, i) => (
        <div
          key={i}
          className="harbor-twinkle absolute"
          style={{
            left: g.x - 14 * g.s,
            top: g.y - 3 * g.s,
            width: 28 * g.s,
            height: 6 * g.s,
            borderRadius: 999,
            background: 'radial-gradient(closest-side, #ffffff, rgba(255,255,255,0))',
            animationDuration: `${2.2 + g.t * 3}s`,
            animationDelay: `${-g.d * 5}s`
          }}
        />
      ))}
    </div>
  )
}
