'use client'

import { QRCodeSVG } from 'qrcode.react'
import { forwardRef } from 'react'
import { balancedLayers } from '../_lib/chroma'
import { QrSettings, TEST_VALUE } from '../_lib/presets'

/** '#rrggbb' and 0–100 as an rgba() colour */
const rgba = (hex: string, percent: number) => {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${percent / 100})`
}

/**
 * Blue channel encoding: the code is written into the blue channel of whatever is under it and nothing else. A layer
 * that is white where it should change nothing and (255, 255, 255 - k) where the blue should drop, blended by
 * multiplying, scales each pixel's blue by that and leaves its red and green exactly as they were. The other way,
 * black where nothing should change and (0, 0, k) elsewhere, blended by screening, lifts only the blue. The layer is
 * fully opaque: the strength is in the colour, so the change is the same strength wherever it falls on the scene.
 */
function blueColours(strength: number, direction: QrSettings['direction']) {
  const k = Math.round((255 * strength) / 100)
  return direction === 'darken'
    ? { fg: `rgb(255, 255, ${255 - k})`, bg: '#ffffff', blend: 'multiply' as const }
    : { fg: '#000000', bg: `rgb(0, 0, ${k})`, blend: 'screen' as const }
}

/**
 * The test code, laid over the whole screen as flat vector graphics (not part of the 3D scene), so the moving water
 * can't bend its grid and its edges stay sharp. Nothing here changes by itself: no flicker, no pulsing.
 */
export const QrLayer = forwardRef<HTMLDivElement, { s: QrSettings }>(function QrLayer({ s }, ref) {
  const side = `${s.size}dvh`
  const blue = s.encoding === 'blue'
  const b = blueColours(s.strength, s.direction)
  const place = {
    width: side,
    height: side,
    left: `calc((100vw - ${side}) * ${s.x / 100})`,
    top: `calc((100dvh - ${side}) * ${s.y / 100})`
  }

  // balanced chrominance: two layers over the same square, one multiplying and one screening, each blended with the
  // scene from its own fixed layer (see the comment below)
  if (s.encoding === 'balanced') {
    const c = balancedLayers(s.strength, s.reference)
    return (
      <>
        {(['multiply', 'screen'] as const).map((mode, i) => (
          <div
            key={mode}
            ref={i === 0 ? ref : undefined}
            className="pointer-events-none fixed inset-0 z-10001"
            style={{ mixBlendMode: mode }}
            aria-hidden="true"
          >
            <div className="absolute" style={place}>
              <QRCodeSVG
                value={TEST_VALUE}
                level="L"
                marginSize={4}
                fgColor={c[mode].dark}
                bgColor={c[mode].light}
                style={{ display: 'block', width: '100%', height: '100%', shapeRendering: 'crispEdges' }}
              />
            </div>
          </div>
        ))}
      </>
    )
  }

  return (
    // the blue-channel blend is set here, on the layer itself: a blend only reaches what is below it in the same
    // stacking context, and this fixed, stacked layer is the first element that shares one with the scene
    <div
      className="pointer-events-none fixed inset-0 z-10001"
      style={{ mixBlendMode: blue ? b.blend : undefined }}
      aria-hidden="true"
    >
      <div
        ref={ref}
        className="absolute"
        style={{
          width: side,
          height: side,
          left: `calc((100vw - ${side}) * ${s.x / 100})`,
          top: `calc((100dvh - ${side}) * ${s.y / 100})`,
          opacity: blue ? 1 : s.opacity / 100,
          mixBlendMode: blue ? undefined : s.blend,
          backgroundColor: blue ? undefined : rgba(s.background, s.backgroundOpacity)
        }}
      >
        <QRCodeSVG
          value={TEST_VALUE}
          level="L"
          marginSize={4}
          fgColor={blue ? b.fg : s.foreground}
          bgColor={blue ? b.bg : 'transparent'}
          style={{ display: 'block', width: '100%', height: '100%', shapeRendering: 'crispEdges' }}
        />
      </div>
    </div>
  )
})
