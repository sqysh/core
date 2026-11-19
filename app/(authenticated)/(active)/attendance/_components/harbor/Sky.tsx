import { SCENE_W } from '../../_lib/harborMap'

// Clouds built the way the illustration's are: a flat underside, a cluster of round lobes on top, all white with a
// lilac shadow showing along the lower edge and a paler lilac inside the lobes. Each variant is a list of lobes.
const SHAPES: { w: number; h: number; lobes: [number, number, number][] }[] = [
  {
    w: 460,
    h: 190,
    lobes: [
      [70, 128, 46],
      [140, 98, 64],
      [225, 78, 74],
      [308, 104, 60],
      [372, 126, 44],
      [250, 128, 52]
    ]
  },
  {
    w: 380,
    h: 160,
    lobes: [
      [62, 112, 38],
      [120, 88, 52],
      [195, 70, 60],
      [262, 94, 50],
      [316, 112, 36],
      [190, 112, 44]
    ]
  },
  {
    w: 520,
    h: 200,
    lobes: [
      [60, 140, 42],
      [128, 110, 58],
      [206, 84, 68],
      [290, 70, 62],
      [368, 100, 56],
      [440, 130, 44],
      [260, 130, 50]
    ]
  },
  {
    w: 340,
    h: 140,
    lobes: [
      [54, 100, 32],
      [108, 78, 44],
      [172, 64, 50],
      [232, 86, 42],
      [282, 102, 30],
      [170, 100, 38]
    ]
  }
]

function Cloud({ variant }: { variant: number }) {
  const { w, h, lobes } = SHAPES[variant % SHAPES.length]
  const base = h - 14
  const body = (
    <>
      {lobes.map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} />
      ))}
      <rect
        x={lobes[0][0] - lobes[0][2] * 0.6}
        y={base - 44}
        width={lobes[lobes.length - 1][0] - lobes[0][0] + lobes[0][2] * 0.9}
        height={44}
        rx={22}
      />
    </>
  )
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="block h-full w-full overflow-visible" aria-hidden="true">
      <defs>
        <clipPath id={`cloud-base-${variant}`}>
          <rect x="-20" y="-20" width={w + 40} height={base + 20} />
        </clipPath>
      </defs>
      <g clipPath={`url(#cloud-base-${variant})`}>
        <g fill="#d6cdf3" transform="translate(8 12)">
          {body}
        </g>
        <g fill="#ffffff">{body}</g>
        <g fill="#ece7fc" opacity="0.8">
          {lobes.slice(1, -1).map(([x, y, r], i) => (
            <ellipse key={i} cx={x - r * 0.15} cy={y + r * 0.62} rx={r * 0.62} ry={r * 0.26} />
          ))}
        </g>
        <g fill="#ffffff">
          {lobes.slice(1, -1).map(([x, y, r], i) => (
            <circle key={i} cx={x - r * 0.28} cy={y - r * 0.3} r={r * 0.34} />
          ))}
        </g>
      </g>
      <path
        d={`M${w * 0.55} ${base + 2} Q${w * 0.9} ${base - 4} ${w * 1.3} ${base - 22} Q${w * 0.95} ${base + 6} ${w * 0.55} ${base + 8} Z`}
        fill="#ffffff"
        opacity="0.55"
      />
    </svg>
  )
}

// y is the cloud's top edge in the picture's own units; the picture's sky now starts at the top of the screen
const CLOUDS = [
  { y: 30, w: 560, seconds: 260, offset: 0.1, opacity: 0.95 },
  { y: 150, w: 440, seconds: 210, offset: 0.55, opacity: 0.9 },
  { y: 300, w: 620, seconds: 240, offset: 0.8, opacity: 0.85 },
  { y: 90, w: 400, seconds: 190, offset: 0.3, opacity: 0.8 },
  { y: 440, w: 480, seconds: 280, offset: 0.68, opacity: 0.75 },
  { y: 560, w: 360, seconds: 230, offset: 0.92, opacity: 0.7 }
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
              height: c.w * (SHAPES[i % SHAPES.length].h / SHAPES[i % SHAPES.length].w),
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
