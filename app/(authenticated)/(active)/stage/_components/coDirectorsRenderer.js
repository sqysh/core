/** Canvas renderer for the Co-Directors moment: a two-sail boat crossing a
 *  blue-hour sea toward the horizon. Vector only. Pairs with the lighthouse
 *  and lantern scenes. */
export function mountCoDirectors(canvas, { animated = true } = {}) {
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
  const random = rand(90821)
  const stars = Array.from({ length: 120 }, () => ({ x: random() * 1920, y: random() * 460, r: 0.6 + random() * 2, phase: random() * 6.28, rate: 0.4 + random() * 1.3 }))
  const glints = Array.from({ length: 84 }, () => ({ x: 360 + random() * 1560, y: 605 + random() * 455, len: 12 + random() * 110, phase: random() * 6.28, rate: 0.35 + random() * 1.2 }))

  const BX = 486 // boat center x
  const DECK = 658 // hull reference; the horizon (584) crosses the hull so it sits in the water

  const drawWater = (t, glowX) => {
    for (let i = 0; i < 16; i++) {
      const baseY = 616 + i * 29
      const off = Math.sin(t * 0.5 + i * 0.7) * (8 + i * 1.6)
      const bob = Math.cos(t * 0.8 + i * 0.4) * (2 + i * 0.5)
      const y = baseY + bob
      ctx.beginPath()
      ctx.moveTo(-20, y)
      for (let x = -20; x <= 1960; x += 120) {
        const wy = y + Math.sin(x * 0.012 + t * 1.1 + i) * (4 + i * 0.7) + off * 0.25
        ctx.lineTo(x, wy)
      }
      ctx.strokeStyle = i % 3 === 0 ? 'rgba(124,147,196,0.16)' : 'rgba(10,36,60,0.26)'
      ctx.lineWidth = 7 + i * 0.9
      ctx.stroke()
      if (i > 6) {
        ctx.beginPath()
        ctx.moveTo(-20, y - 2)
        for (let x = -20; x <= 1960; x += 120) {
          const wy = y - 2 + Math.sin(x * 0.012 + t * 1.1 + i) * (4 + i * 0.7) + off * 0.25
          ctx.lineTo(x, wy)
        }
        ctx.strokeStyle = `rgba(190,206,230,${0.04 + (i - 6) * 0.012})`
        ctx.lineWidth = 2
        ctx.stroke()
      }
    }

    // cool reflection of the sails on the water
    const rx = Math.max(220, Math.min(1860, glowX))
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    for (let k = 0; k < 20; k++) {
      const yy = 608 + k * 16
      const sway = Math.sin(t * 1.3 + k * 0.5) * (7 + k)
      const w = (34 + k * 5) * 0.8
      const a = 0.09 * (1 - k / 22)
      ctx.fillStyle = `rgba(196,214,240,${a.toFixed(3)})`
      ctx.fillRect(rx + sway - w / 2, yy, w, 5)
    }
    ctx.restore()

    ctx.lineCap = 'round'
    for (const g of glints) {
      const pulse = (1 + Math.sin(g.phase + t * g.rate)) / 2
      ctx.globalAlpha = 0.02 + pulse * 0.2
      ctx.strokeStyle = g.y > 850 ? '#5b7498' : '#c3d2ea'
      ctx.lineWidth = 1.6 + ((g.y - 600) / 500) * 2.2
      ctx.beginPath()
      const shift = Math.sin(t * 0.7 + g.phase) * 20
      ctx.moveTo(g.x + shift, g.y)
      ctx.lineTo(g.x + g.len * (0.45 + 0.5 * pulse) + shift, g.y)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
  }

  const drawBoat = (t) => {
    const bob = Math.sin(t * 0.9) * 6
    const roll = Math.sin(t * 0.9 + 0.6) * 0.016
    const fill = 24 + 10 * Math.sin(t * 1.2) // sail belly, "filling" with wind

    ctx.save()
    ctx.translate(BX, bob)
    ctx.rotate(roll)

    const mx = -14 // mast x (slightly aft)
    const mastTop = DECK - 360

    // mainsail (billows left/aft)
    const H = [mx, mastTop + 6]
    const C = [mx - 172, DECK - 128]
    const T = [mx - 6, DECK - 100]
    const mid = [(H[0] + C[0]) / 2 - fill, (H[1] + C[1]) / 2]
    const mg = ctx.createLinearGradient(mx - 172, 0, mx, 0)
    mg.addColorStop(0, '#9fb0cc')
    mg.addColorStop(0.5, '#e8edf5')
    mg.addColorStop(1, '#c2ccdd')
    ctx.fillStyle = mg
    ctx.beginPath()
    ctx.moveTo(H[0], H[1])
    ctx.lineTo(T[0], T[1])
    ctx.lineTo(C[0], C[1])
    ctx.quadraticCurveTo(mid[0], mid[1], H[0], H[1])
    ctx.closePath()
    ctx.fill()
    // seam + leech shading
    ctx.strokeStyle = 'rgba(80,100,135,0.25)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(H[0], H[1])
    ctx.quadraticCurveTo(mid[0] + 10, mid[1] + 8, C[0] + 8, C[1] - 4)
    ctx.stroke()

    // jib (foresail, billows right/forward)
    const JH = [mx + 8, mastTop + 70]
    const JT = [96, DECK - 78] // bowsprit
    const JC = [mx + 54, DECK - 96]
    const jmid = [(JH[0] + JT[0]) / 2 + fill * 0.8, (JH[1] + JT[1]) / 2]
    const jg = ctx.createLinearGradient(mx, 0, 110, 0)
    jg.addColorStop(0, '#c7d0e0')
    jg.addColorStop(1, '#eef2f8')
    ctx.fillStyle = jg
    ctx.beginPath()
    ctx.moveTo(JH[0], JH[1])
    ctx.lineTo(JC[0], JC[1])
    ctx.lineTo(JT[0], JT[1])
    ctx.quadraticCurveTo(jmid[0], jmid[1], JH[0], JH[1])
    ctx.closePath()
    ctx.fill()

    // mast
    ctx.strokeStyle = '#2a3344'
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.moveTo(mx, mastTop)
    ctx.lineTo(mx, DECK - 92)
    ctx.stroke()

    // masthead pennant (flutters)
    ctx.fillStyle = '#7c93c4'
    ctx.beginPath()
    ctx.moveTo(mx, mastTop)
    for (let s = 0; s <= 1; s += 0.25) {
      ctx.lineTo(mx + 48 * s, mastTop - 6 + Math.sin(t * 6 + s * 6) * 4 * s)
    }
    for (let s = 1; s >= 0; s -= 0.25) {
      ctx.lineTo(mx + 48 * s, mastTop + 2 + Math.sin(t * 6 + s * 6) * 4 * s)
    }
    ctx.closePath()
    ctx.fill()

    // hull (bow to the right)
    const hull = ctx.createLinearGradient(0, DECK - 96, 0, DECK - 40)
    hull.addColorStop(0, '#30465f')
    hull.addColorStop(1, '#1b2a3c')
    ctx.fillStyle = hull
    ctx.beginPath()
    ctx.moveTo(-158, DECK - 96)
    ctx.lineTo(176, DECK - 102) // bow tip
    ctx.quadraticCurveTo(150, DECK - 64, 120, DECK - 60)
    ctx.lineTo(-120, DECK - 58)
    ctx.quadraticCurveTo(-168, DECK - 60, -158, DECK - 96)
    ctx.closePath()
    ctx.fill()
    // boot stripe
    ctx.fillStyle = '#7c93c4'
    ctx.beginPath()
    ctx.moveTo(-150, DECK - 92)
    ctx.lineTo(170, DECK - 98)
    ctx.lineTo(166, DECK - 90)
    ctx.lineTo(-148, DECK - 84)
    ctx.closePath()
    ctx.fill()

    ctx.restore()

    // bow wave + wake on the water (outside the boat's roll transform)
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    const foamX = BX + 150
    const foamY = DECK + bob - 46
    for (let i = 0; i < 7; i++) {
      const a = 0.16 - i * 0.02
      const w = 16 + i * 10 + Math.sin(t * 5 + i) * 3
      ctx.fillStyle = `rgba(214,228,246,${a})`
      ctx.fillRect(foamX + i * 6, foamY + i * 4 + Math.sin(t * 4 + i) * 2, w, 3)
    }
    // trailing wake to the left
    for (let i = 0; i < 10; i++) {
      const wx = BX - 140 - i * 46
      const wy = DECK + bob - 42 + i * 5 + Math.sin(t * 2 + i * 0.6) * 4
      ctx.fillStyle = `rgba(190,206,232,${0.1 - i * 0.008})`
      ctx.fillRect(wx, wy, 40 + i * 3, 3)
    }
    ctx.restore()
  }

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

  const draw = (time) => {
    const t = running ? time : 0
    ctx.save()
    ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0)

    // blue-hour sky
    const sky = ctx.createLinearGradient(0, 0, 0, 590)
    ;[
      [0, '#121c33'],
      [0.3, '#1f2f50'],
      [0.55, '#35507a'],
      [0.8, '#6f86ad'],
      [1, '#c9c0c6']
    ].forEach(([p, c]) => sky.addColorStop(p, c))
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, 1920, 590)

    // cool horizon glow toward which the boat sails
    const warmth = ctx.createRadialGradient(1120, 600, 30, 1120, 600, 1050)
    warmth.addColorStop(0, 'rgba(201,192,198,.28)')
    warmth.addColorStop(1, 'rgba(201,192,198,0)')
    ctx.fillStyle = warmth
    ctx.fillRect(0, 140, 1920, 450)

    for (const s of stars) {
      const pulse = 0.42 + 0.42 * Math.sin(t * s.rate + s.phase)
      ctx.globalAlpha = (0.16 + Math.max(0.06, pulse) * 0.5) * (1 - s.y / 540)
      ctx.fillStyle = '#eef1f8'
      ctx.beginPath()
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1

    const ocean = ctx.createLinearGradient(0, 584, 0, 1080)
    ocean.addColorStop(0, '#2e4d6e')
    ocean.addColorStop(0.3, '#223f5c')
    ocean.addColorStop(0.65, '#15293f')
    ocean.addColorStop(1, '#0b1a2a')
    ctx.fillStyle = ocean
    ctx.fillRect(0, 584, 1920, 496)

    drawWater(t, BX - 10)
    drawBoat(t)

    const shade = ctx.createLinearGradient(0, 0, 0, 1080)
    shade.addColorStop(0, 'rgba(6,16,30,.08)')
    shade.addColorStop(1, 'rgba(2,12,24,.22)')
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
