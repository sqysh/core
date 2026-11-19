import { SCENE_W } from '../../_lib/harborMap'

// Clouds drawn like the illustration's: flat white, lilac in the shade underneath, a few lighter lobes on top
function Cloud({ variant }: { variant: number }) {
  return variant % 2 === 0 ? (
    <svg viewBox="0 0 420 170" className="block h-full w-full" aria-hidden="true">
      <path
        d="M44 150 Q8 150 16 120 Q24 92 62 98 Q64 58 108 58 Q126 18 178 28 Q214 2 256 32 Q306 22 318 68 Q362 60 374 100 Q410 108 400 138 Q394 152 366 152 Z"
        fill="#ffffff"
      />
      <path
        d="M24 136 Q66 124 110 134 Q160 118 212 132 Q262 116 312 130 Q356 120 398 132 Q392 152 366 152 L44 152 Q18 150 24 136 Z"
        fill="#ddd6f6"
      />
      <path d="M120 62 Q142 40 176 46 Q156 50 146 70 Z M226 46 Q262 40 284 66 Q258 58 238 64 Z" fill="#efeaff" />
    </svg>
  ) : (
    <svg viewBox="0 0 360 140" className="block h-full w-full" aria-hidden="true">
      <path
        d="M36 124 Q6 122 14 98 Q22 76 54 82 Q60 46 102 50 Q124 16 170 30 Q210 14 236 44 Q282 40 290 78 Q332 76 340 102 Q346 124 318 126 Z"
        fill="#ffffff"
      />
      <path
        d="M20 112 Q70 100 120 110 Q180 96 240 108 Q290 98 338 110 Q336 126 318 126 L36 124 Q16 122 20 112 Z"
        fill="#dcd5f5"
      />
      <path d="M112 54 Q134 36 160 40 Q142 46 132 62 Z" fill="#efeaff" />
    </svg>
  )
}

// y is the cloud's top edge; negative values sit in the extra sky above the picture on taller screens
const CLOUDS = [
  { y: -420, w: 620, seconds: 260, offset: 0.1, opacity: 0.95 },
  { y: -250, w: 480, seconds: 210, offset: 0.55, opacity: 0.9 },
  { y: -90, w: 560, seconds: 240, offset: 0.8, opacity: 0.85 },
  { y: 40, w: 420, seconds: 190, offset: 0.3, opacity: 0.8 },
  { y: 170, w: 520, seconds: 280, offset: 0.68, opacity: 0.75 },
  { y: 330, w: 380, seconds: 230, offset: 0.92, opacity: 0.7 }
]

export function DriftingClouds() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      {CLOUDS.map((c, i) => (
        <div
          key={i}
          className="harbor-drift absolute left-0"
          style={
            {
              top: c.y,
              width: c.w,
              height: c.w * 0.4,
              opacity: c.opacity,
              animationDuration: `${c.seconds}s`,
              animationDelay: `${-c.offset * c.seconds}s`,
              '--from': `${-c.w}px`,
              '--to': `${SCENE_W + 40}px`
            } as React.CSSProperties
          }
        >
          <Cloud variant={i} />
        </div>
      ))}
    </div>
  )
}

function Gull({ size, flapDelay }: { size: number; flapDelay: number }) {
  return (
    <svg width={size} height={size * 0.5} viewBox="0 0 60 30" className="block overflow-visible" aria-hidden="true">
      <g className="harbor-flap" style={{ animationDelay: `${flapDelay}s`, transformOrigin: '30px 15px' }}>
        <path d="M30 15 Q20 4 4 8 Q16 9 26 18 Z" fill="#ffffff" />
        <path d="M30 15 Q40 4 56 8 Q44 9 34 18 Z" fill="#e4e1f4" />
        <path d="M4 8 Q8 7 10 8 L8 10 Z M56 8 Q52 7 50 8 L52 10 Z" fill="#5b6b8f" />
      </g>
      <ellipse cx="30" cy="16" rx="7" ry="3.2" fill="#ffffff" />
      <path d="M36 15.5 L40 16.5 L36 17.2 Z" fill="#f2b84b" />
    </svg>
  )
}

// A few gulls cross now and then; each flock spends most of its loop off screen
const FLOCKS = [
  {
    y: 260,
    seconds: 46,
    delay: -6,
    dir: 1,
    birds: [
      { dx: 0, dy: 0, size: 54 },
      { dx: -70, dy: 30, size: 46 },
      { dx: -130, dy: -14, size: 40 }
    ]
  },
  {
    y: 470,
    seconds: 64,
    delay: -38,
    dir: -1,
    birds: [
      { dx: 0, dy: 0, size: 40 },
      { dx: 56, dy: 22, size: 34 }
    ]
  }
]

export function Seabirds() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      {FLOCKS.map((f, i) => (
        <div
          key={i}
          className="harbor-flight absolute left-0"
          style={
            {
              top: f.y,
              animationDuration: `${f.seconds}s`,
              animationDelay: `${f.delay}s`,
              '--from': `${f.dir > 0 ? -260 : SCENE_W + 260}px`,
              '--to': `${f.dir > 0 ? SCENE_W + 260 : -260}px`
            } as React.CSSProperties
          }
        >
          {f.birds.map((b, j) => (
            <div
              key={j}
              className="absolute"
              style={{ left: b.dx * f.dir, top: b.dy, transform: f.dir < 0 ? 'scaleX(-1)' : undefined }}
            >
              <Gull size={b.size} flapDelay={-j * 0.23} />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
