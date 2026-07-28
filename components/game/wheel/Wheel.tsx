'use client'

import { Wedge, wedgeColor, wedgeLabel, wedgeTextColor, WHEEL } from '@/types/_wheel.types'
// app/components/games/wheel/Wheel.tsx
//
// Real-WoF-style spinning wheel: 24 bright wedges, black Bankrupt, white Lose a
// Turn, and labels with each CHARACTER STACKED along the wedge's spoke (digit
// over digit, letter over letter) — the show's signature look. Big center hub,
// chartreuse ticker. Driven by `targetIndex` + `nonce`.

import { useEffect, useRef, useState } from 'react'
import type { ReactElement } from 'react'

interface WheelProps {
  targetIndex: number | null
  nonce: number
  size?: number
  onSettled?: () => void
}

const SLICE = 360 / WHEEL.length
const HUB_RATIO = 0.3 // big green center; labels live in the outer band

// ── Label tuning dials ───────────────────────────────────────────────────────
// Tweak these to move the stacked numbers around. All are fractions of the
// wheel radius (r), so they scale with size automatically.
const LABEL_OUTER = 0.99 // how close the OUTERMOST char sits to the rim (1.0 = rim)
const LABEL_INNER = 0.34 // how close the INNERMOST char may reach toward the hub
const CHAR_GAP_VALUE = 0.9 // vertical spacing between stacked digits (× fontSize)
const CHAR_GAP_PENALTY = 0.92 // spacing for BANKRUPT / LOSE A TURN letters
const FONT_VALUE = 0.06 // digit size (× wheel size) — bigger = fills more space
const FONT_PENALTY = 0.04 // penalty-word letter size (× wheel size)
const SUP_GAP = 1.6 // gap between the $ and the first digit (× charGap) — raise to push digits DOWN
const SUP_INSET = 0.045 // how far in from the rim the $ sits (× r) — smaller = closer to rim
const PENALTY_INSET = 0.9 // how far in from the rim BANKRUPT / LOSE A TURN start (× charGap) — raise to push them DOWN/in
const PENALTY_LINE_GAP = 1.4 // vertical spacing between stacked WORDS (LOSE / A / TURN) (× fontSize)

// What to render on a wedge. Values stack as individual digits with a $ super.
// Penalty phrases stack as WHOLE WORDS on separate lines (LOSE / A / TURN), each
// word drawn horizontally — matching the real wheel.
// A penalty render spec. `lines` are horizontal words (top→down); `stack` is a
// word rendered as vertical letters running down the spoke. Matches the real
// wheel: LOSE (small) / A / then TURN stacked vertically and large.
interface PenaltySpec {
  lines: string[] // horizontal words near the top
  stack?: string // word stacked as vertical letters below the lines
}

function stackChars(w: Wedge): {
  sup?: string
  chars: string[]
  penalty?: PenaltySpec
} {
  if (w === 'BANKRUPT') return { chars: 'BANKRUPT'.split('') } // vertical letters along spoke
  if (w === 'LOSE_TURN') return { chars: [], penalty: { lines: ['LOSE', 'A'], stack: 'TURN' } }
  const label = wedgeLabel(w) // e.g. "$600"
  const digits = label.replace('$', '').split('')
  return { sup: '$', chars: digits }
}

// Arc width (chord) available at a given radius for one wedge — used to
// auto-scale horizontal words so they never overflow the wedge.
function wedgeWidthAt(rad: number): number {
  return 2 * rad * Math.sin((SLICE / 2) * (Math.PI / 180))
}

export default function Wheel({ targetIndex, nonce, size = 380, onSettled }: WheelProps) {
  const [angle, setAngle] = useState(0)
  const angleRef = useRef(0)
  const lastNonce = useRef(0)

  useEffect(() => {
    if (nonce === 0 || nonce === lastNonce.current || targetIndex == null) return
    lastNonce.current = nonce

    const center = (targetIndex + 0.5) * SLICE
    const base = angleRef.current
    const currentMod = ((base % 360) + 360) % 360
    const desiredMod = (360 - center) % 360
    let delta = desiredMod - currentMod
    if (delta < 0) delta += 360
    const SPINS = 6
    const target = base + SPINS * 360 + delta

    angleRef.current = target
    requestAnimationFrame(() => setAngle(target))

    const t = setTimeout(() => onSettled?.(), 4600)
    return () => clearTimeout(t)
  }, [nonce, targetIndex, onSettled])

  const r = size / 2
  const cx = r
  const cy = r
  const hubR = r * HUB_RATIO

  // radial band where stacked characters sit, driven by the dials above
  const innerLabel = Math.max(hubR + size * 0.01, r * LABEL_INNER)
  const outerLabel = r * LABEL_OUTER

  return (
    <div style={{ width: size, height: size, position: 'relative', margin: '0 auto' }}>
      {/* Pointer / ticker at top */}
      <div
        style={{
          position: 'absolute',
          top: -8,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 0,
          height: 0,
          borderLeft: `${size * 0.038}px solid transparent`,
          borderRight: `${size * 0.038}px solid transparent`,
          borderTop: `${size * 0.07}px solid #A6FF4D`,
          zIndex: 5,
          filter: 'drop-shadow(0 3px 3px rgba(0,0,0,0.5))'
        }}
      />
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{
          transform: `rotate(${angle}deg)`,
          transition: 'transform 4.5s cubic-bezier(0.15, 0.7, 0.08, 1)',
          filter: 'drop-shadow(0 8px 30px rgba(0,0,0,0.45))'
        }}
      >
        <defs>
          {/* soft drop shadow under the stacked characters, like the embossed
              digits on the real wheel */}
          <filter id="wofTextShadow" x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow
              dx="0"
              dy={size * 0.004}
              stdDeviation={size * 0.004}
              floodColor="#000000"
              floodOpacity="0.55"
            />
          </filter>
        </defs>
        <circle cx={cx} cy={cy} r={r - 1} fill="none" stroke="#06121b" strokeWidth={6} />

        {WHEEL.map((w, i) => {
          const a0 = (i * SLICE - 90) * (Math.PI / 180)
          const a1 = ((i + 1) * SLICE - 90) * (Math.PI / 180)
          const x0 = cx + r * Math.cos(a0)
          const y0 = cy + r * Math.sin(a0)
          const x1 = cx + r * Math.cos(a1)
          const y1 = cy + r * Math.sin(a1)
          const path = `M${cx},${cy} L${x0},${y0} A${r},${r} 0 0,1 ${x1},${y1} Z`

          const midDeg = (i + 0.5) * SLICE
          const midRad = (midDeg - 90) * (Math.PI / 180)

          const { sup, chars, penalty } = stackChars(w)
          const isPenalty = w === 'BANKRUPT' || w === 'LOSE_TURN'
          const fontSize = isPenalty ? size * FONT_PENALTY : size * FONT_VALUE
          const charGap = isPenalty ? fontSize * CHAR_GAP_PENALTY : fontSize * CHAR_GAP_VALUE
          const textColor = wedgeTextColor(w, i)

          // Place chars along the spoke, outermost first going inward. Labels
          // read radially outward like the real wheel — bottom-half ones sit
          // upside-down when stopped, which is fine (the result lands at top).
          const ordered = chars
          const supVal = sup // $ near the outer edge

          return (
            <g key={i}>
              <path d={path} fill={wedgeColor(w, i)} stroke="#06121b" strokeWidth={1.4} />
              <g filter="url(#wofTextShadow)">
                {/* PENALTY (LOSE A TURN): small horizontal words near the rim,
                    then TURN stacked as vertical letters below — auto-scaled so
                    each horizontal word fits the wedge width at its radius. */}
                {penalty &&
                  (() => {
                    const els: ReactElement[] = []
                    let rad = outerLabel - charGap * PENALTY_INSET

                    // horizontal lines (LOSE, A)
                    penalty.lines.forEach((word, li) => {
                      const maxW = wedgeWidthAt(rad) * 0.82
                      // scale font so the word fits the wedge width (≈0.6×fontSize per char)
                      const naturalW = word.length * fontSize * 0.62
                      const scale = Math.min(1, maxW / naturalW)
                      const fs = fontSize * scale
                      const px = cx + rad * Math.cos(midRad)
                      const py = cy + rad * Math.sin(midRad)
                      els.push(
                        <text
                          key={`l${li}`}
                          x={px}
                          y={py}
                          fill={textColor}
                          fontSize={fs}
                          fontWeight="800"
                          fontFamily="'Quicksand', sans-serif"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          transform={`rotate(${midDeg}, ${px}, ${py})`}
                        >
                          {word}
                        </text>
                      )
                      rad -= fontSize * PENALTY_LINE_GAP
                    })

                    // vertical stacked word (TURN) — letters down the spoke, larger
                    if (penalty.stack) {
                      rad -= fontSize * 0.25 // small gap before the stack
                      penalty.stack.split('').forEach((ch, si) => {
                        if (rad < innerLabel) return
                        const px = cx + rad * Math.cos(midRad)
                        const py = cy + rad * Math.sin(midRad)
                        els.push(
                          <text
                            key={`s${si}`}
                            x={px}
                            y={py}
                            fill={textColor}
                            fontSize={fontSize * 1.15}
                            fontWeight="800"
                            fontFamily="'Quicksand', sans-serif"
                            textAnchor="middle"
                            dominantBaseline="middle"
                            transform={`rotate(${midDeg}, ${px}, ${py})`}
                          >
                            {ch}
                          </text>
                        )
                        rad -= fontSize * 1.15 * CHAR_GAP_PENALTY
                      })
                    }
                    return els
                  })()}

                {/* superscript $ near the outer edge for value wedges */}
                {sup &&
                  (() => {
                    const rad = outerLabel - r * SUP_INSET
                    const px = cx + rad * Math.cos(midRad)
                    const py = cy + rad * Math.sin(midRad)
                    return (
                      <text
                        x={px}
                        y={py}
                        fill={textColor}
                        fontSize={fontSize * 0.55}
                        fontWeight="800"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        transform={`rotate(${midDeg}, ${px}, ${py})`}
                        className="font-lobster"
                      >
                        {supVal}
                      </text>
                    )
                  })()}
                {!penalty &&
                  ordered.map((ch, ci) => {
                    // distribute chars from outer→inner along the spoke
                    // digits start a clear gap below the $ (SUP_GAP); penalty words
                    // start a PENALTY_INSET in from the rim — both tunable above.
                    const startR = outerLabel - (sup ? charGap * SUP_GAP : charGap * PENALTY_INSET)
                    const rad = startR - ci * charGap
                    if (rad < innerLabel) return null
                    const px = cx + rad * Math.cos(midRad)
                    const py = cy + rad * Math.sin(midRad)
                    return (
                      <text
                        key={ci}
                        x={px}
                        y={py}
                        fill={textColor}
                        fontSize={fontSize}
                        fontWeight="800"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        transform={`rotate(${midDeg}, ${px}, ${py})`}
                        className="font-lobster"
                      >
                        {ch}
                      </text>
                    )
                  })}
              </g>
            </g>
          )
        })}

        {/* big center hub */}
        <circle cx={cx} cy={cy} r={hubR} fill="#1Fa34a" stroke="#06121b" strokeWidth={4} />
        <circle cx={cx} cy={cy} r={hubR * 0.5} fill="#06121b" stroke="#A6FF4D" strokeWidth={3} />
      </svg>
    </div>
  )
}
