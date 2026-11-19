import type { ReactNode } from 'react'

// Boats drawn to sit in the lighthouse illustration: flat fills, a lighter plane where the sun catches, lilac in
// the shade like its clouds and house, no outlines. Every boat is on a 240 x 200 canvas, bow to the right, with the
// waterline at y=170 and the hull running x 20-230; anything below the waterline is clipped off by the boat itself.

export const ART_W = 240
export const ART_H = 200
export const WATERLINE = 170
export const ART_LENGTH = 210
export const ART_CENTER = 125

export interface Palette {
  hull: string
  hullShade: string
  trim: string
  cabin: string
  cabinShade: string
  roof: string
  sail: string
  sailShade: string
  accent: string
}

export const PALETTES: Palette[] = [
  {
    hull: '#fbf6ec',
    hullShade: '#d8d1ea',
    trim: '#e2405c',
    cabin: '#fbf6ec',
    cabinShade: '#d5cdea',
    roof: '#e2405c',
    sail: '#fffdf8',
    sailShade: '#d9d3f0',
    accent: '#f2c14e'
  },
  {
    hull: '#2c5aa0',
    hullShade: '#1f4180',
    trim: '#fbf6ec',
    cabin: '#fbf6ec',
    cabinShade: '#cfd3ec',
    roof: '#2c5aa0',
    sail: '#fffdf8',
    sailShade: '#d6d6f2',
    accent: '#e2405c'
  },
  {
    hull: '#e2405c',
    hullShade: '#b92f4b',
    trim: '#fbf6ec',
    cabin: '#fbf6ec',
    cabinShade: '#dccfe6',
    roof: '#c9354f',
    sail: '#fff6e6',
    sailShade: '#e8d6e4',
    accent: '#2c5aa0'
  },
  {
    hull: '#1d9ac7',
    hullShade: '#167aa6',
    trim: '#fbf6ec',
    cabin: '#fbf6ec',
    cabinShade: '#d0d6ee',
    roof: '#f2c14e',
    sail: '#fffdf8',
    sailShade: '#d4dcf2',
    accent: '#f58a5c'
  },
  {
    hull: '#f2c14e',
    hullShade: '#d39d35',
    trim: '#2c5aa0',
    cabin: '#fbf6ec',
    cabinShade: '#dcd2e8',
    roof: '#2c5aa0',
    sail: '#fff8ea',
    sailShade: '#e6dcec',
    accent: '#e2405c'
  },
  {
    hull: '#3f8f5e',
    hullShade: '#2f7049',
    trim: '#fbf6ec',
    cabin: '#fbf6ec',
    cabinShade: '#d2d6e6',
    roof: '#e2405c',
    sail: '#f7ecd6',
    sailShade: '#ddd0d8',
    accent: '#f2c14e'
  },
  {
    hull: '#b9784e',
    hullShade: '#94593a',
    trim: '#f6e7c8',
    cabin: '#f6e7c8',
    cabinShade: '#dcc8c8',
    roof: '#e2405c',
    sail: '#f2c9a4',
    sailShade: '#d8a98c',
    accent: '#2c5aa0'
  },
  {
    hull: '#26385f',
    hullShade: '#1a2848',
    trim: '#e2405c',
    cabin: '#fbf6ec',
    cabinShade: '#cfd0e8',
    roof: '#e2405c',
    sail: '#fffdf8',
    sailShade: '#d6d4ee',
    accent: '#f2c14e'
  }
]

const GLASS = '#5a7fd6'
const GLASS_LIGHT = '#a9c3f5'
const DECK = '#e9c995'
const DECK_SHADE = '#c9a271'
const RIG = '#e8e3f3'

export interface BoatKind {
  key: string
  label: string
  /** Hull length relative to an average boat at the same depth */
  size: number
  /** Highest point above the waterline, in art units */
  top: number
  art: (p: Palette) => ReactNode
  /** Where the boat's crew member stands on deck: feet at (x, y) in art units, and how big to draw them */
  crew: { x: number; y: number; scale: number }
}

const shadeId = (p: Palette) => `harbor-hull-${p.hull.slice(1)}`

/** The hull darkens toward the water, the way the illustration shades its rocks and house */
function HullShade({ p }: { p: Palette }) {
  return (
    <defs>
      <linearGradient id={shadeId(p)} gradientUnits="userSpaceOnUse" x1="0" y1="134" x2="0" y2="172">
        <stop offset="0.35" stopColor={p.hull} />
        <stop offset="1" stopColor={p.hullShade} />
      </linearGradient>
    </defs>
  )
}

/** Hull side with a sheer line rising to the bow, a sunlit top band and a stripe at the waterline */
function Hull({ p, d, band, stripe }: { p: Palette; d: string; band: string; stripe: string }) {
  return (
    <>
      <HullShade p={p} />
      <path d={d} fill={`url(#${shadeId(p)})`} />
      <path d={band} fill="#ffffff" opacity="0.28" />
      <path d={stripe} fill={p.trim} />
    </>
  )
}

export const BOATS: BoatKind[] = [
  {
    key: 'sloop',
    label: 'sailboat',
    size: 1,
    top: 16,
    crew: { x: 178, y: 140, scale: 1 },
    art: (p) => (
      <>
        <path d="M112 18 L112 128 L46 132 Q66 74 112 18 Z" fill={p.sail} />
        <path d="M112 18 L112 128 L86 130 Q92 70 112 18 Z" fill={p.sailShade} />
        <path d="M117 24 L210 134 L126 134 Z" fill={p.sail} />
        <path d="M117 24 L150 134 L126 134 Z" fill={p.sailShade} opacity="0.7" />
        <rect x="110.5" y="16" width="3.5" height="122" rx="1.5" fill={RIG} />
        <path d="M112 128 L44 132" stroke="#c9c2dc" strokeWidth="3" strokeLinecap="round" />
        <path d="M114 16 L130 21 L114 26 Z" fill={p.accent} />
        <path d="M26 148 L218 138 L208 132 L40 139 Z" fill={DECK} />
        <path d="M80 140 L150 136 L146 122 L90 124 Z" fill={p.cabin} />
        <path d="M80 140 L150 136 L149 132 L81 136 Z" fill={p.cabinShade} />
        <rect x="98" y="127" width="10" height="5" rx="2" fill={GLASS} />
        <rect x="116" y="126" width="10" height="5" rx="2" fill={GLASS} />
        <Hull
          p={p}
          d="M24 148 L220 138 Q232 137 228 148 L212 182 L40 182 Q30 182 28 172 Z"
          band="M24 148 L220 138 L222 144 L25 154 Z"
          stripe="M28 164 L216 158 L214 164 L29 170 Z"
        />
      </>
    )
  },
  {
    key: 'schooner',
    label: 'schooner',
    size: 1.22,
    top: 8,
    crew: { x: 192, y: 141, scale: 1 },
    art: (p) => (
      <>
        <path d="M150 12 L150 130 L106 132 L104 40 Z" fill={p.sail} />
        <path d="M150 12 L150 130 L130 131 L128 34 Z" fill={p.sailShade} />
        <path d="M96 24 L96 132 L40 134 L44 56 Z" fill={p.sail} />
        <path d="M96 24 L96 132 L74 133 L74 46 Z" fill={p.sailShade} />
        <path d="M154 18 L236 132 L160 134 Z" fill={p.sail} />
        <path d="M154 18 L186 133 L160 134 Z" fill={p.sailShade} opacity="0.7" />
        <rect x="148.5" y="8" width="3.5" height="132" rx="1.5" fill={DECK_SHADE} />
        <rect x="94.5" y="20" width="3.5" height="120" rx="1.5" fill={DECK_SHADE} />
        <path d="M218 140 L238 132" stroke={DECK_SHADE} strokeWidth="3" strokeLinecap="round" />
        <path d="M151 8 L166 13 L151 18 Z" fill={p.accent} />
        <path d="M24 148 L220 140 L210 134 L40 140 Z" fill={DECK} />
        <Hull
          p={p}
          d="M22 148 L222 140 Q232 139 228 150 L210 182 L40 182 Q28 182 26 172 Z"
          band="M22 148 L222 140 L223 146 L23 154 Z"
          stripe="M26 163 L218 157 L216 162 L27 168 Z"
        />
        {[50, 80, 110, 140, 170, 200].map((x) => (
          <circle key={x} cx={x} cy={156 - (x - 22) * 0.04} r="3.2" fill={p.trim} opacity="0.85" />
        ))}
      </>
    )
  },
  {
    key: 'trawler',
    label: 'fishing trawler',
    size: 1.05,
    top: 34,
    crew: { x: 98, y: 138, scale: 1 },
    art: (p) => (
      <>
        <rect x="140" y="34" width="3.5" height="98" rx="1.5" fill={RIG} />
        <path d="M141 44 L58 118 M141 44 L80 126" stroke={RIG} strokeWidth="2.5" />
        <path d="M58 118 L70 140 L86 128 Z" fill="#8fa3c8" opacity="0.75" />
        <path d="M124 132 L178 128 L178 92 L128 94 Z" fill={p.cabin} />
        <path d="M124 132 L178 128 L178 120 L125 124 Z" fill={p.cabinShade} />
        <path d="M120 95 L182 91 L176 84 L126 87 Z" fill={p.roof} />
        <rect x="134" y="100" width="12" height="11" rx="2" fill={GLASS} />
        <rect x="152" y="99" width="12" height="11" rx="2" fill={GLASS} />
        <rect x="134" y="100" width="5" height="11" rx="2" fill={GLASS_LIGHT} opacity="0.7" />
        <circle cx="171" cy="113" r="5" fill="none" stroke={p.accent} strokeWidth="3" />
        <circle cx="48" cy="134" r="5" fill="#f58a5c" />
        <circle cx="62" cy="136" r="5" fill={p.accent} />
        <HullShade p={p} />
        <path d="M24 144 L200 132 Q222 116 230 120 L214 182 L40 182 Q28 182 26 170 Z" fill={`url(#${shadeId(p)})`} />
        <path d="M24 144 L200 132 Q222 116 230 120 L229 126 Q220 124 202 138 L25 150 Z" fill="#ffffff" opacity="0.28" />
        <path d="M27 162 L218 154 L216 160 L28 168 Z" fill={p.trim} />
      </>
    )
  },
  {
    key: 'lobster',
    label: 'lobster boat',
    size: 0.95,
    top: 92,
    crew: { x: 120, y: 143, scale: 1 },
    art: (p) => (
      <>
        <rect x="168" y="92" width="3" height="20" fill={RIG} />
        <path d="M136 141 L198 138 L192 112 L142 114 Z" fill={p.cabin} />
        <path d="M136 141 L198 138 L197 132 L137 135 Z" fill={p.cabinShade} />
        <path d="M134 115 L196 112 L202 106 L132 109 Z" fill={p.roof} />
        <path d="M176 116 L190 115 L194 131 L178 132 Z" fill={GLASS} />
        <path d="M150 117 L170 116 L171 130 L151 131 Z" fill={GLASS} />
        <path d="M150 117 L157 117 L158 130 L151 131 Z" fill={GLASS_LIGHT} opacity="0.7" />
        <path d="M40 142 L74 140 L74 120 L40 122 Z" fill="#c98d5e" />
        <path d="M78 141 L108 139 L108 122 L78 124 Z" fill="#b97e52" />
        <path d="M48 128 L104 125 M48 134 L104 131" stroke="#8f5c39" strokeWidth="1.6" opacity="0.6" />
        <path d="M56 120 L90 118 L90 106 L56 108 Z" fill="#d79a68" />
        <Hull
          p={p}
          d="M22 148 L222 140 Q232 140 228 150 L212 182 L38 182 Q26 182 24 172 Z"
          band="M22 148 L222 140 L223 146 L23 154 Z"
          stripe="M25 163 L218 157 L216 163 L26 169 Z"
        />
      </>
    )
  },
  {
    key: 'yacht',
    label: 'motor yacht',
    size: 1.1,
    top: 84,
    crew: { x: 38, y: 146, scale: 0.95 },
    art: (p) => (
      <>
        <path d="M118 98 L118 84 L124 84 L128 98" stroke={RIG} strokeWidth="3" fill="none" />
        <path d="M94 112 L164 108 L156 96 L102 98 Z" fill={p.cabin} />
        <path d="M60 138 L200 130 L184 108 L76 112 Z" fill={p.cabin} />
        <path d="M60 138 L200 130 L196 125 L64 132 Z" fill={p.cabinShade} />
        <path d="M84 122 L180 117 L176 112 L88 115 Z" fill="#2b3d6e" />
        <path d="M110 105 L150 103 L148 99 L112 100 Z" fill="#2b3d6e" />
        <Hull
          p={p}
          d="M18 148 L226 134 Q238 134 232 146 L214 182 L38 182 Q24 182 22 172 Z"
          band="M18 148 L226 134 L229 140 L19 154 Z"
          stripe="M60 150 L206 142 L204 147 L62 155 Z"
        />
        <path d="M24 164 L222 154 L220 160 L25 170 Z" fill={p.trim} />
      </>
    )
  },
  {
    key: 'tug',
    label: 'tugboat',
    size: 0.86,
    top: 66,
    crew: { x: 196, y: 141, scale: 0.95 },
    art: (p) => (
      <>
        <rect x="150" y="66" width="3" height="28" fill={RIG} />
        <circle cx="151.5" cy="66" r="3.5" fill={p.accent} />
        <path d="M76 140 L98 139 L96 98 L80 99 Z" fill={p.roof} />
        <path d="M80 99 L96 98 L96 106 L80 107 Z" fill="#26385f" />
        <path d="M108 140 L174 138 L172 96 L112 98 Z" fill={p.cabin} />
        <path d="M108 140 L174 138 L174 130 L109 132 Z" fill={p.cabinShade} />
        <path d="M106 99 L178 95 L172 89 L112 92 Z" fill={p.roof} />
        {[118, 136, 154].map((x) => (
          <rect key={x} x={x} y={103} width="11" height="10" rx="2" fill={GLASS} />
        ))}
        <HullShade p={p} />
        <path d="M24 146 L218 140 Q230 140 226 150 L208 182 L40 182 Q28 182 26 172 Z" fill={`url(#${shadeId(p)})`} />
        <path d="M24 146 L218 140 L219 146 L25 152 Z" fill="#ffffff" opacity="0.25" />
        <path d="M26 162 L216 156 L214 163 L27 169 Z" fill={p.trim} />
        {[50, 84, 118, 152, 186].map((x) => (
          <circle key={x} cx={x} cy={153 - (x - 24) * 0.03} r="6" fill="#2a2c3a" />
        ))}
      </>
    )
  },
  {
    key: 'dinghy',
    label: 'sailing dinghy',
    size: 0.62,
    top: 18,
    crew: { x: 150, y: 146, scale: 1.3 },
    art: (p) => (
      <>
        <path d="M120 18 L120 138 L58 142 Q78 80 120 18 Z" fill={p.accent} />
        <path d="M120 18 L120 138 L96 140 Q100 76 120 18 Z" fill="#000000" opacity="0.12" />
        <rect x="118.5" y="16" width="4" height="130" rx="2" fill={RIG} />
        <path d="M30 150 L214 144 L206 138 L44 144 Z" fill={DECK} />
        <Hull
          p={p}
          d="M28 150 L216 144 Q228 144 224 154 L206 182 L44 182 Q32 182 30 172 Z"
          band="M28 150 L216 144 L218 150 L29 156 Z"
          stripe="M31 165 L212 160 L210 165 L32 170 Z"
        />
      </>
    )
  }
]

// ─── Crew ─────────────────────────────────────────────────────────────────────
// One little sailor on each boat, drawn on the same flat-fill terms as the boats. Their look comes from a number
// (the member's id hashed), so the same person turns up in the same shirt every week.

const SHIRTS = ['#e2405c', '#2c5aa0', '#f2c14e', '#1d9ac7', '#fbf6ec', '#f58a5c', '#6bbf8a', '#8b6fd1']
const SKINS = ['#f3d2b3', '#e2b48c', '#c68a5e', '#a0683f', '#74492c']
const HAIRS = ['#2b2118', '#5a3a22', '#a9743a', '#d8b25a', '#7c7c86', '#8a3b2a']

export function Crew({
  x,
  y,
  scale,
  seed,
  waving
}: {
  x: number
  y: number
  scale: number
  seed: number
  waving: boolean
}) {
  const shirt = SHIRTS[(seed >>> 3) % SHIRTS.length]
  const skin = SKINS[(seed >>> 6) % SKINS.length]
  const hair = HAIRS[(seed >>> 9) % HAIRS.length]
  const cap = ((seed >>> 12) & 1) === 1
  const capColor = SHIRTS[(seed >>> 14) % SHIRTS.length]
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      {/* legs */}
      <rect x="-3.6" y="-10" width="3.3" height="10" rx="1.4" fill="#2b3d6e" />
      <rect x="0.3" y="-10" width="3.3" height="10" rx="1.4" fill="#26365f" />
      {/* the arm at rest, then the one that waves */}
      <rect x="-7.4" y="-23" width="3.2" height="11" rx="1.6" fill={shirt} />
      <circle cx="-5.8" cy="-11.6" r="1.8" fill={skin} />
      {/* torso */}
      <rect x="-4.8" y="-24" width="9.6" height="15" rx="3.2" fill={shirt} />
      <rect x="-4.8" y="-24" width="4" height="15" rx="2" fill="#000" opacity="0.08" />
      <g className={waving ? 'harbor-arm' : undefined} style={{ transformBox: 'fill-box', transformOrigin: '50% 8%' }}>
        <rect x="4.2" y="-23" width="3.2" height="11" rx="1.6" fill={shirt} />
        <circle cx="5.8" cy="-11.6" r="1.8" fill={skin} />
      </g>
      {/* head */}
      <circle cx="0" cy="-29" r="4.8" fill={skin} />
      {cap ? (
        <>
          <path d="M-5 -29.4 A5 5 0 0 1 5 -29.4 Z" fill={capColor} />
          <rect x="-1" y="-30" width="7" height="1.6" rx="0.8" fill={capColor} />
        </>
      ) : (
        <path d="M-5 -29 A5 5 0 0 1 5 -29 Q0 -32.4 -5 -29 Z" fill={hair} />
      )}
    </g>
  )
}
