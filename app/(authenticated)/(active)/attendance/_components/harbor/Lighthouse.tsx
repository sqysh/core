// The lighthouse stays exactly as drawn. On top of it: a warm light in the lantern room, and a beam that turns
// around the tower, flaring as it swings past the viewer.

export const SCENE_SRC = '/images/harbor/scene.webp'

/** Centre of the lantern room's glass */
const LANTERN = { x: 1245, y: 226 }
const GLASS = { x: 1192, y: 190, w: 105, h: 72 }
const BEAM_SECONDS = 12

/** The tower's outline, used to cut it out of the picture so drifting clouds pass behind it */
const TOWER =
  'polygon(1244px 48px, 1252px 48px, 1254px 118px, 1262px 124px, 1330px 182px, 1320px 191px, 1302px 192px, 1300px 244px, 1337px 247px, 1339px 271px, 1350px 600px, 1137px 600px, 1160px 271px, 1154px 268px, 1155px 247px, 1192px 244px, 1190px 192px, 1170px 191px, 1162px 182px, 1236px 124px, 1242px 118px)'

/**
 * Keyframes for a beam turning at constant speed: its projected length is the cosine of the angle (so it shortens,
 * flips and lengthens on the far side), and it's brightest while pointing out toward the viewer.
 */
function beamKeyframes() {
  const steps = 36
  let beam = ''
  let flare = ''
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2
    const pct = ((i / steps) * 100).toFixed(2)
    const toward = Math.max(0, Math.sin(a))
    const sx = Math.cos(a)
    beam += `${pct}%{transform:scaleX(${(Math.abs(sx) < 0.02 ? 0.02 * Math.sign(sx || 1) : sx).toFixed(3)});opacity:${(0.22 + 0.5 * toward).toFixed(3)}}`
    flare += `${pct}%{opacity:${Math.pow(toward, 6).toFixed(3)};transform:scale(${(0.7 + 0.5 * Math.pow(toward, 6)).toFixed(3)})}`
  }
  return `@keyframes harbor-beam{${beam}}@keyframes harbor-flare{${flare}}`
}

const KEYFRAMES = beamKeyframes()

export function LighthouseCutout() {
  return (
    <img
      src={SCENE_SRC}
      alt=""
      className="pointer-events-none absolute left-0 top-0"
      style={{ width: 3200, height: 1280, clipPath: TOWER }}
    />
  )
}

export function LighthouseLight() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <style>{KEYFRAMES}</style>

      {/* Warm lamp behind the glass */}
      <div
        className="harbor-flicker absolute"
        style={{
          left: GLASS.x,
          top: GLASS.y,
          width: GLASS.w,
          height: GLASS.h,
          borderRadius: 6,
          background:
            'radial-gradient(60% 70% at 50% 55%, rgba(255,236,170,0.95), rgba(255,206,120,0.55) 55%, rgba(255,190,110,0.1))',
          mixBlendMode: 'screen'
        }}
      />

      {/* Soft scatter around the lantern */}
      <div
        className="harbor-flicker absolute rounded-full"
        style={{
          left: LANTERN.x - 190,
          top: LANTERN.y - 190,
          width: 380,
          height: 380,
          background:
            'radial-gradient(closest-side, rgba(255,240,190,0.55), rgba(255,240,190,0.18) 45%, rgba(255,240,190,0))',
          mixBlendMode: 'screen'
        }}
      />

      {/* The beam, tilted a little down toward the sea */}
      <div className="absolute" style={{ left: LANTERN.x, top: LANTERN.y, transform: 'rotate(5deg)' }}>
        {[
          { len: 2300, h: 300, color: 'rgba(255,243,200,0.32)' },
          { len: 2100, h: 150, color: 'rgba(255,248,215,0.55)' }
        ].map((b, i) => (
          <div
            key={i}
            className="absolute left-0"
            style={{
              top: -b.h / 2,
              width: b.len,
              height: b.h,
              transformOrigin: '0 50%',
              animation: `harbor-beam ${BEAM_SECONDS}s linear infinite`,
              background: `linear-gradient(to right, ${b.color}, rgba(255,243,200,0) 92%)`,
              clipPath: 'polygon(0 47%, 100% 0, 100% 100%, 0 53%)',
              mixBlendMode: 'screen'
            }}
          />
        ))}
      </div>

      {/* The flash as the beam sweeps past the viewer */}
      <div
        className="absolute rounded-full"
        style={{
          left: LANTERN.x - 260,
          top: LANTERN.y - 260,
          width: 520,
          height: 520,
          animation: `harbor-flare ${BEAM_SECONDS}s linear infinite`,
          background:
            'radial-gradient(closest-side, rgba(255,252,235,0.95), rgba(255,240,190,0.45) 25%, rgba(255,240,190,0) 70%)',
          mixBlendMode: 'screen'
        }}
      />
    </div>
  )
}
