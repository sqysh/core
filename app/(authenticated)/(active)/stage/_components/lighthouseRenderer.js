/** Canvas animation renderer, no external dependencies. Keeps the lighthouse.jpg
 *  composite; adds a dramatic sweeping beacon and moving water. */
export function mountLighthouse(canvas, source, { animated = true } = {}) {
  const ctx = canvas.getContext('2d', { alpha: false })
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  let running = animated && !reduced,
    raf = 0,
    t0 = performance.now()
  let width = 1920,
    height = 1080,
    scaleX = 1,
    scaleY = 1
  const rand = (seed) => () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }
  const random = rand(73291)
  const stars = Array.from({ length: 170 }, () => ({
    x: random() * 1920,
    y: random() * 525,
    r: 0.7 + random() * 2.3,
    phase: random() * 6.28,
    rate: 0.4 + random() * 1.4
  }))
  const glints = Array.from({ length: 90 }, () => ({
    x: 420 + random() * 1540,
    y: 605 + random() * 455,
    len: 12 + random() * 120,
    phase: random() * 6.28,
    rate: 0.35 + random() * 1.2
  }))
  let maskedImage

  // Portrait art placement and the lamp position derived from it.
  const ART = { h: 1080, w: (415 / 740) * 1080 * 0.84, x: 0 }
  const lampX = ART.x + (80 / 415) * ART.w
  const lampY = (150 / 740) * ART.h

  const buildMask = () => {
    const c = document.createElement('canvas')
    c.width = 415
    c.height = 740
    const cc = c.getContext('2d')
    cc.drawImage(source, 0, 0, 415, 740)
    cc.globalCompositeOperation = 'destination-in'
    const g = cc.createLinearGradient(0, 0, 415, 0)
    g.addColorStop(0, 'rgba(0,0,0,.88)')
    g.addColorStop(0.06, '#000')
    g.addColorStop(0.73, '#000')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    cc.fillStyle = g
    cc.fillRect(0, 0, 415, 740)
    maskedImage = c
  }

  if (source.complete && source.naturalWidth) buildMask()
  else source.addEventListener('load', buildMask, { once: true })

  const resize = () => {
    const rect = canvas.getBoundingClientRect()
    const ratio = Math.min(window.devicePixelRatio || 1, 2)
    const w = Math.max(1, Math.round(rect.width * ratio))
    const h = Math.max(1, Math.round(rect.height * ratio))
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w
      canvas.height = h
    }
    width = w
    height = h
    scaleX = w / 1920
    scaleY = h / 1080
    if (!running) draw(0)
  }

  const drawSupplementalRocks = (t) => {
    const drift = Math.sin(t * 0.12) * 4
    const rockGrad = ctx.createLinearGradient(0, 500, 450, 1080)
    rockGrad.addColorStop(0, '#34465a')
    rockGrad.addColorStop(0.28, '#2c3746')
    rockGrad.addColorStop(0.62, '#221f2f')
    rockGrad.addColorStop(1, '#101720')
    ctx.fillStyle = rockGrad

    ctx.beginPath()
    ctx.moveTo(-70, 1080)
    ctx.lineTo(-70, 730)
    ctx.lineTo(12 + drift, 690)
    ctx.lineTo(55, 724)
    ctx.lineTo(74, 676)
    ctx.lineTo(145, 728)
    ctx.lineTo(205, 698)
    ctx.lineTo(255, 760)
    ctx.lineTo(242, 839)
    ctx.lineTo(324, 892)
    ctx.lineTo(366, 983)
    ctx.lineTo(315, 1080)
    ctx.closePath()
    ctx.fill()

    ctx.beginPath()
    ctx.moveTo(0, 655)
    ctx.lineTo(22, 612)
    ctx.lineTo(48, 635)
    ctx.lineTo(68, 585)
    ctx.lineTo(114, 611)
    ctx.lineTo(123, 684)
    ctx.lineTo(34, 708)
    ctx.closePath()
    ctx.fill()

    ctx.beginPath()
    ctx.moveTo(8, 824)
    ctx.lineTo(59, 786)
    ctx.lineTo(111, 812)
    ctx.lineTo(137, 873)
    ctx.lineTo(88, 918)
    ctx.lineTo(18, 903)
    ctx.closePath()
    ctx.fill()

    ctx.beginPath()
    ctx.moveTo(210, 875)
    ctx.lineTo(260, 845)
    ctx.lineTo(315, 874)
    ctx.lineTo(300, 925)
    ctx.lineTo(232, 936)
    ctx.closePath()
    ctx.fill()

    ctx.save()
    ctx.globalAlpha = 0.18
    const hi = ctx.createLinearGradient(0, 560, 280, 910)
    hi.addColorStop(0, 'rgba(179,156,185,.9)')
    hi.addColorStop(0.5, 'rgba(109,123,145,.25)')
    hi.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = hi
    ctx.beginPath()
    ctx.moveTo(18, 822)
    ctx.lineTo(66, 792)
    ctx.lineTo(105, 812)
    ctx.lineTo(92, 851)
    ctx.lineTo(42, 857)
    ctx.closePath()
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(9, 653)
    ctx.lineTo(28, 618)
    ctx.lineTo(56, 635)
    ctx.lineTo(38, 669)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }

  // Animated ocean: rolling swells, bright crests, a moving beam reflection and sparkle.
  const drawWater = (t, beamX, flash) => {
    for (let i = 0; i < 16; i++) {
      const baseY = 616 + i * 29
      const amp = 8 + i * 1.6
      const off = Math.sin(t * 0.5 + i * 0.7) * amp
      const bob = Math.cos(t * 0.8 + i * 0.4) * (2 + i * 0.5)
      const y = baseY + bob
      ctx.beginPath()
      ctx.moveTo(-20, y)
      for (let x = -20; x <= 1960; x += 120) {
        const wy = y + Math.sin(x * 0.012 + t * 1.1 + i) * (4 + i * 0.7) + off * 0.25
        ctx.lineTo(x, wy)
      }
      ctx.strokeStyle = i % 3 === 0 ? 'rgba(120,196,206,0.16)' : 'rgba(10,52,92,0.26)'
      ctx.lineWidth = 7 + i * 0.9
      ctx.stroke()
      if (i > 6) {
        ctx.beginPath()
        ctx.moveTo(-20, y - 2)
        for (let x = -20; x <= 1960; x += 120) {
          const wy = y - 2 + Math.sin(x * 0.012 + t * 1.1 + i) * (4 + i * 0.7) + off * 0.25
          ctx.lineTo(x, wy)
        }
        ctx.strokeStyle = `rgba(190,230,230,${0.04 + (i - 6) * 0.012})`
        ctx.lineWidth = 2
        ctx.stroke()
      }
    }

    // moving reflection of the beacon on the water
    const rx = Math.max(560, Math.min(1860, beamX))
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    for (let k = 0; k < 26; k++) {
      const yy = 592 + k * 18
      const sway = Math.sin(t * 1.6 + k * 0.55) * (10 + k * 1.2)
      const w = (26 + k * 7) * (0.6 + 0.4 * flash)
      const a = (0.1 + 0.16 * flash) * (1 - k / 28)
      ctx.fillStyle = `rgba(210,248,226,${a.toFixed(3)})`
      ctx.fillRect(rx + sway - w / 2, yy, w, 6)
    }
    ctx.restore()

    // sparkle
    ctx.lineCap = 'round'
    for (const g of glints) {
      const pulse = (1 + Math.sin(g.phase + t * g.rate)) / 2
      ctx.globalAlpha = 0.02 + pulse * 0.24
      ctx.strokeStyle = g.y > 850 ? '#6ba8ad' : '#aee0d8'
      ctx.lineWidth = 1.6 + ((g.y - 600) / 500) * 2.4
      ctx.beginPath()
      const shift = Math.sin(t * 0.7 + g.phase) * 22
      ctx.moveTo(g.x + shift, g.y)
      ctx.lineTo(g.x + g.len * (0.45 + 0.5 * pulse) + shift, g.y)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
  }

  // beacon sweep params for a given time (shared by the water reflection and the beams)
  const beacon = (t) => {
    const mainAng = 0.2 + Math.sin(t * 0.5) * 0.46
    const flash = Math.pow(Math.max(0, Math.cos(t * 0.5)), 1.6)
    const sinA = Math.sin(mainAng) || 0.001
    const beamX = lampX + ((584 - lampY) / sinA) * Math.cos(mainAng)
    return { mainAng, flash, beamX }
  }

  // Sweeping beacon: bright additive beams that flash as they pass front.
  const drawBeams = (mainAng, flash) => {
    const beam = (angle, intensity, len) => {
      ctx.save()
      ctx.translate(lampX, lampY)
      ctx.rotate(angle)
      const g = ctx.createLinearGradient(0, 0, len, 0)
      g.addColorStop(0, `rgba(236,255,232,${0.6 * intensity})`)
      g.addColorStop(0.22, `rgba(188,246,220,${0.3 * intensity})`)
      g.addColorStop(0.65, `rgba(174,240,226,${0.1 * intensity})`)
      g.addColorStop(1, 'rgba(174,240,226,0)')
      ctx.fillStyle = g
      const endSpread = len * 0.2
      ctx.beginPath()
      ctx.moveTo(0, -16)
      ctx.lineTo(len, -endSpread)
      ctx.lineTo(len, endSpread)
      ctx.lineTo(0, 16)
      ctx.closePath()
      ctx.fill()
      const core = ctx.createLinearGradient(0, 0, len, 0)
      core.addColorStop(0, `rgba(255,255,246,${0.55 * intensity})`)
      core.addColorStop(0.6, `rgba(255,255,246,${0.12 * intensity})`)
      core.addColorStop(1, 'rgba(255,255,246,0)')
      ctx.fillStyle = core
      ctx.beginPath()
      ctx.moveTo(0, -5)
      ctx.lineTo(len, -endSpread * 0.32)
      ctx.lineTo(len, endSpread * 0.32)
      ctx.lineTo(0, 5)
      ctx.closePath()
      ctx.fill()
      ctx.restore()
    }

    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    beam(mainAng, 0.5 + 0.9 * flash, 1850)
    beam(mainAng - 0.86, 0.16 + 0.14 * flash, 1200)
    const fr = 120 + 90 * flash
    const flare = ctx.createRadialGradient(lampX, lampY, 2, lampX, lampY, fr)
    flare.addColorStop(0, `rgba(255,255,240,${0.7 + 0.3 * flash})`)
    flare.addColorStop(0.3, `rgba(255,244,198,${0.3 + 0.3 * flash})`)
    flare.addColorStop(1, 'rgba(255,240,190,0)')
    ctx.fillStyle = flare
    ctx.fillRect(lampX - fr, lampY - fr, fr * 2, fr * 2)
    ctx.restore()
  }

  const draw = (time) => {
    const t = running ? time : 0
    ctx.save()
    ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0)

    const sky = ctx.createLinearGradient(0, 0, 0, 590)
    ;[
      [0, '#10283c'],
      [0.19, '#213d69'],
      [0.47, '#38668c'],
      [0.75, '#638f99'],
      [1, '#c29a9a']
    ].forEach(([p, c]) => sky.addColorStop(p, c))
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, 1920, 590)

    const warmth = ctx.createRadialGradient(1450, 600, 30, 1450, 600, 1050)
    warmth.addColorStop(0, 'rgba(244,170,160,.3)')
    warmth.addColorStop(1, 'rgba(244,170,160,0)')
    ctx.fillStyle = warmth
    ctx.fillRect(0, 100, 1920, 490)

    const ocean = ctx.createLinearGradient(0, 584, 0, 1080)
    ocean.addColorStop(0, '#356d88')
    ocean.addColorStop(0.25, '#205674')
    ocean.addColorStop(0.6, '#0b3b60')
    ocean.addColorStop(1, '#052b47')
    ctx.fillStyle = ocean
    ctx.fillRect(0, 584, 1920, 496)

    const bc = beacon(t)
    drawWater(t, bc.beamX, bc.flash)

    // Supplemental rocks first, so the portrait art can overlap them naturally.
    drawSupplementalRocks(t)

    // Portrait art (the lighthouse photo), shifted left for TV composition.
    if (maskedImage) ctx.drawImage(maskedImage, ART.x, 0, ART.w, ART.h)

    // Stars.
    for (const s of stars) {
      const pulse = 0.48 + 0.42 * Math.sin(t * s.rate + s.phase)
      ctx.globalAlpha = 0.25 + Math.max(0.08, pulse) * 0.68
      ctx.fillStyle = '#f6f5e8'
      ctx.beginPath()
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
      ctx.fill()
      if (s.r > 2.1) {
        ctx.globalAlpha = 0.07 + 0.14 * pulse
        ctx.fillRect(s.x - 7, s.y - 0.4, 14, 0.8)
        ctx.fillRect(s.x - 0.4, s.y - 7, 0.8, 14)
      }
    }
    ctx.globalAlpha = 1

    // Clouds.
    const cx = 1170 + Math.sin(t * 0.055) * 85
    ctx.save()
    ctx.translate(cx, 134)
    ctx.globalAlpha = 0.7
    const cg = ctx.createLinearGradient(0, -50, 0, 66)
    cg.addColorStop(0, 'rgba(211,213,216,.78)')
    cg.addColorStop(1, 'rgba(130,165,182,0)')
    ctx.fillStyle = cg
    ctx.beginPath()
    ctx.moveTo(-275, 25)
    ctx.bezierCurveTo(-90, -32, -5, -4, 102, -24)
    ctx.bezierCurveTo(158, -64, 234, -75, 305, -22)
    ctx.bezierCurveTo(355, -8, 417, -16, 450, 4)
    ctx.bezierCurveTo(225, 38, -40, 48, -275, 25)
    ctx.fill()
    ctx.restore()

    // Sweeping beacon over the whole scene.
    drawBeams(bc.mainAng, bc.flash)

    const shade = ctx.createLinearGradient(0, 0, 0, 1080)
    shade.addColorStop(0, 'rgba(2,13,34,.07)')
    shade.addColorStop(1, 'rgba(0,12,27,.22)')
    ctx.fillStyle = shade
    ctx.fillRect(0, 0, 1920, 1080)

    ctx.restore()
  }

  const frame = (now) => {
    draw((now - t0) / 1000)
    if (running) raf = requestAnimationFrame(frame)
  }
  const ro = new ResizeObserver(resize)
  ro.observe(canvas)
  resize()
  if (running) raf = requestAnimationFrame(frame)
  else draw(0)

  return {
    setAnimated(on) {
      running = Boolean(on) && !reduced
      cancelAnimationFrame(raf)
      t0 = performance.now()
      if (running) raf = requestAnimationFrame(frame)
      else draw(0)
    },
    destroy() {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }
}
