/** Canvas renderer for the Education moment: a lantern hanging over a dawn sea,
 *  a breathing golden glow, rising motes of light, and moving water.
 *  Vector only — no image asset. Pairs with the lighthouse scene. */
export function mountEducation(canvas, { animated = true } = {}) {
  const ctx = canvas.getContext('2d', { alpha: false })
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  let running = animated && !reduced,
    raf = 0,
    t0 = performance.now(),
    lastT = 0
  let width = 1920,
    height = 1080,
    scaleX = 1,
    scaleY = 1
  const rand = (seed) => () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }
  const random = rand(51237)
  const stars = Array.from({ length: 90 }, () => ({ x: random() * 1920, y: random() * 360, r: 0.6 + random() * 1.8, phase: random() * 6.28, rate: 0.4 + random() * 1.3 }))
  const glints = Array.from({ length: 80 }, () => ({ x: 360 + random() * 1560, y: 605 + random() * 455, len: 12 + random() * 110, phase: random() * 6.28, rate: 0.35 + random() * 1.2 }))

  // Post + hanging lantern geometry (1920x1080 scene space).
  const POST = { x: 372, baseY: 772, topY: 300, armLen: 66 }
  const PIVOT = { x: POST.x + POST.armLen, y: POST.topY + 26 }
  const HANG = 74

  const motes = []
  const GREEN = [52, 211, 153]
  const GOLD = [255, 206, 120]

  const lanternPos = (t) => {
    const ang = 0.11 * Math.sin(t * 1.05)
    return { x: PIVOT.x + HANG * Math.sin(ang), y: PIVOT.y + HANG * Math.cos(ang), ang }
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

  const drawWater = (t, glowX, intensity) => {
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
      ctx.strokeStyle = i % 3 === 0 ? 'rgba(126,196,176,0.16)' : 'rgba(10,58,70,0.26)'
      ctx.lineWidth = 7 + i * 0.9
      ctx.stroke()
      if (i > 6) {
        ctx.beginPath()
        ctx.moveTo(-20, y - 2)
        for (let x = -20; x <= 1960; x += 120) {
          const wy = y - 2 + Math.sin(x * 0.012 + t * 1.1 + i) * (4 + i * 0.7) + off * 0.25
          ctx.lineTo(x, wy)
        }
        ctx.strokeStyle = `rgba(200,226,208,${0.04 + (i - 6) * 0.012})`
        ctx.lineWidth = 2
        ctx.stroke()
      }
    }

    // warm reflection of the lantern on the water
    const rx = Math.max(220, Math.min(1860, glowX))
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    for (let k = 0; k < 24; k++) {
      const yy = 592 + k * 18
      const sway = Math.sin(t * 1.4 + k * 0.5) * (8 + k * 1.1)
      const w = (22 + k * 6) * (0.6 + 0.4 * intensity)
      const a = (0.1 + 0.16 * intensity) * (1 - k / 26)
      ctx.fillStyle = `rgba(255,214,150,${a.toFixed(3)})`
      ctx.fillRect(rx + sway - w / 2, yy, w, 6)
    }
    ctx.restore()

    ctx.lineCap = 'round'
    for (const g of glints) {
      const pulse = (1 + Math.sin(g.phase + t * g.rate)) / 2
      ctx.globalAlpha = 0.02 + pulse * 0.2
      ctx.strokeStyle = g.y > 850 ? '#5f9f92' : '#bfe6cf'
      ctx.lineWidth = 1.6 + ((g.y - 600) / 500) * 2.2
      ctx.beginPath()
      const shift = Math.sin(t * 0.7 + g.phase) * 20
      ctx.moveTo(g.x + shift, g.y)
      ctx.lineTo(g.x + g.len * (0.45 + 0.5 * pulse) + shift, g.y)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
  }

  const drawPost = () => {
    const { x, baseY, topY, armLen } = POST
    // weathered wooden piling
    const wood = ctx.createLinearGradient(x - 12, 0, x + 12, 0)
    wood.addColorStop(0, '#3a2c22')
    wood.addColorStop(0.5, '#5a4432')
    wood.addColorStop(1, '#2e241c')
    ctx.fillStyle = wood
    ctx.fillRect(x - 11, topY, 22, baseY - topY)
    // grain
    ctx.strokeStyle = 'rgba(20,14,10,0.4)'
    ctx.lineWidth = 1.5
    for (const gx of [x - 5, x + 2, x + 7]) {
      ctx.beginPath()
      ctx.moveTo(gx, topY + 8)
      ctx.lineTo(gx, baseY - 6)
      ctx.stroke()
    }
    // cap
    ctx.fillStyle = '#4a3828'
    ctx.fillRect(x - 14, topY - 8, 28, 12)
    // arm reaching to the pivot
    ctx.fillStyle = wood
    ctx.fillRect(x - 4, topY + 2, armLen + 8, 11)
    ctx.fillStyle = '#4a3828'
    ctx.fillRect(x + armLen - 4, topY + 2, 10, 20)
    // hook line down to the lantern pivot
    ctx.strokeStyle = '#2a2018'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(PIVOT.x, topY + 18)
    ctx.lineTo(PIVOT.x, PIVOT.y)
    ctx.stroke()
  }

  const drawLantern = (t) => {
    const { x, y, ang } = lanternPos(t)
    const breathe = 0.5 + 0.5 * Math.sin(t * 1.3)
    const flick = 0.85 + 0.15 * Math.sin(t * 9 + Math.sin(t * 5))

    // big soft glow halo (breathes)
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    const R = 200 + 60 * breathe
    const halo = ctx.createRadialGradient(x, y, 4, x, y, R)
    halo.addColorStop(0, `rgba(255,232,170,${0.5 * flick})`)
    halo.addColorStop(0.3, `rgba(255,200,120,${0.22 + 0.1 * breathe})`)
    halo.addColorStop(0.7, 'rgba(90,200,150,0.05)')
    halo.addColorStop(1, 'rgba(90,200,150,0)')
    ctx.fillStyle = halo
    ctx.fillRect(x - R, y - R, R * 2, R * 2)
    ctx.restore()

    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(ang)

    // bail (handle)
    ctx.strokeStyle = '#2a2018'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(0, -40, 13, Math.PI * 1.05, Math.PI * 1.95)
    ctx.stroke()

    // top cap
    ctx.fillStyle = '#20282f'
    ctx.beginPath()
    ctx.moveTo(-20, -28)
    ctx.lineTo(0, -40)
    ctx.lineTo(20, -28)
    ctx.closePath()
    ctx.fill()
    ctx.fillRect(-18, -28, 36, 6)

    // glass body
    const gw = 17,
      gh = 40
    ctx.fillStyle = '#161d24'
    ctx.fillRect(-gw - 3, -22, (gw + 3) * 2, gh + 6)
    const glass = ctx.createRadialGradient(0, 0, 2, 0, 0, 30)
    glass.addColorStop(0, `rgba(255,248,214,${0.98 * flick})`)
    glass.addColorStop(0.5, `rgba(255,198,110,${0.8 * flick})`)
    glass.addColorStop(1, 'rgba(255,170,70,0.15)')
    ctx.fillStyle = glass
    ctx.fillRect(-gw, -19, gw * 2, gh)
    // flame
    ctx.fillStyle = `rgba(255,236,170,${flick})`
    ctx.beginPath()
    ctx.ellipse(0, 2, 4, 9 * flick, 0, 0, Math.PI * 2)
    ctx.fill()
    // frame bars
    ctx.strokeStyle = 'rgba(14,20,26,0.85)'
    ctx.lineWidth = 2.5
    for (const bx of [-gw + 3, 0, gw - 3]) {
      ctx.beginPath()
      ctx.moveTo(bx, -19)
      ctx.lineTo(bx, gh - 19)
      ctx.stroke()
    }
    // base
    ctx.fillStyle = '#20282f'
    ctx.fillRect(-gw - 4, gh - 20, (gw + 4) * 2, 8)
    ctx.beginPath()
    ctx.moveTo(-10, gh - 12)
    ctx.lineTo(10, gh - 12)
    ctx.lineTo(6, gh - 4)
    ctx.lineTo(-6, gh - 4)
    ctx.closePath()
    ctx.fill()
    ctx.restore()

    return { x, y: y + 2, breathe }
  }

  const stepMotes = (t, dt, src) => {
    // spawn a few rising motes from the lantern
    if (dt > 0 && motes.length < 90) {
      const n = Math.random() < dt * 14 ? 1 : 0
      for (let i = 0; i < n + 1; i++) {
        motes.push({
          x: src.x + (Math.random() - 0.5) * 26,
          y: src.y + (Math.random() - 0.5) * 20,
          vx: (Math.random() - 0.5) * 10,
          vy: -22 - Math.random() * 30,
          life: 1,
          size: 2 + Math.random() * 3.5,
          g: Math.random() < 0.45,
          ph: Math.random() * 6.28
        })
      }
    }
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    for (let i = motes.length - 1; i >= 0; i--) {
      const m = motes[i]
      m.x += (m.vx + Math.sin(t * 2 + m.ph) * 8) * dt
      m.y += m.vy * dt
      m.vy *= 0.992
      m.life -= dt * 0.42
      if (m.life <= 0) {
        motes.splice(i, 1)
        continue
      }
      const col = m.g ? GREEN : GOLD
      const a = Math.max(0, m.life) * 0.8
      const r = m.size * (0.6 + 0.4 * Math.sin(t * 3 + m.ph))
      const grad = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, r * 3)
      grad.addColorStop(0, `rgba(${col[0]},${col[1]},${col[2]},${a})`)
      grad.addColorStop(1, `rgba(${col[0]},${col[1]},${col[2]},0)`)
      ctx.fillStyle = grad
      ctx.fillRect(m.x - r * 3, m.y - r * 3, r * 6, r * 6)
    }
    ctx.restore()
  }

  const draw = (time) => {
    const t = running ? time : 0
    const dt = Math.max(0, Math.min(0.05, t - lastT))
    lastT = t
    ctx.save()
    ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0)

    // dawn sky
    const sky = ctx.createLinearGradient(0, 0, 0, 590)
    ;[
      [0, '#13303f'],
      [0.3, '#1f4f55'],
      [0.56, '#357563'],
      [0.8, '#86ac84'],
      [1, '#f0c89a']
    ].forEach(([p, c]) => sky.addColorStop(p, c))
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, 1920, 590)

    // soft dawn warmth low on the horizon
    const warmth = ctx.createRadialGradient(560, 600, 30, 560, 600, 1100)
    warmth.addColorStop(0, 'rgba(255,206,150,.34)')
    warmth.addColorStop(1, 'rgba(255,206,150,0)')
    ctx.fillStyle = warmth
    ctx.fillRect(0, 120, 1920, 470)

    // fading stars up high
    for (const s of stars) {
      const pulse = 0.4 + 0.4 * Math.sin(t * s.rate + s.phase)
      ctx.globalAlpha = (0.12 + Math.max(0.05, pulse) * 0.4) * (1 - s.y / 420)
      ctx.fillStyle = '#eef3ea'
      ctx.beginPath()
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1

    const ocean = ctx.createLinearGradient(0, 584, 0, 1080)
    ocean.addColorStop(0, '#2f6f74')
    ocean.addColorStop(0.28, '#1f5560')
    ocean.addColorStop(0.62, '#123f4e')
    ocean.addColorStop(1, '#0a2b38')
    ctx.fillStyle = ocean
    ctx.fillRect(0, 584, 1920, 496)

    const lp = lanternPos(t)
    const breathe = 0.5 + 0.5 * Math.sin(t * 1.3)
    drawWater(t, lp.x, 0.55 + 0.45 * breathe)

    drawPost()
    const src = drawLantern(t)
    stepMotes(t, dt, src)

    // gentle vignette
    const shade = ctx.createLinearGradient(0, 0, 0, 1080)
    shade.addColorStop(0, 'rgba(6,24,30,.06)')
    shade.addColorStop(1, 'rgba(2,20,26,.2)')
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
      lastT = 0
      if (running) raf = requestAnimationFrame(frame)
      else draw(0)
    },
    destroy() {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }
}
