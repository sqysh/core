import { CanvasTexture, RepeatWrapping, SRGBColorSpace, Texture } from 'three'
import { rng } from './noise'

// Painted textures drawn on a canvas at runtime: no image downloads, and every tile can share them. Client only.

const cache = new Map<string, Texture>()

function paint(
  key: string,
  w: number,
  h: number,
  draw: (g: CanvasRenderingContext2D) => void,
  { color = true, repeat = true } = {}
) {
  const hit = cache.get(key)
  if (hit) return hit
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  draw(c.getContext('2d')!)
  const tex = new CanvasTexture(c)
  if (color) tex.colorSpace = SRGBColorSpace
  if (repeat) tex.wrapS = tex.wrapT = RepeatWrapping
  tex.anisotropy = 8
  cache.set(key, tex)
  return tex
}

/** Rows of rounded clay tiles. Rows stack down the texture's height (v), tiles run across its width (u). */
function drawRoofTiles(g: CanvasRenderingContext2D, bump: boolean) {
  const W = 512
  const rows = 8
  const cols = 8
  const rh = W / rows
  const cw = W / cols
  const r = rng(7)
  g.fillStyle = bump ? '#000' : '#5e1f17'
  g.fillRect(0, 0, W, W)
  for (let row = 0; row < rows; row++) {
    const off = row % 2 ? cw / 2 : 0
    for (let col = -1; col <= cols; col++) {
      const x = col * cw + off
      const y = row * rh
      const shade = 0.82 + r() * 0.3
      const grad = g.createLinearGradient(0, y, 0, y + rh * 1.15)
      if (bump) {
        grad.addColorStop(0, '#333')
        grad.addColorStop(0.75, '#fff')
        grad.addColorStop(1, '#666')
      } else {
        const base = [196 * shade, 76 * shade, 52 * shade].map((v) => Math.min(255, Math.round(v)))
        grad.addColorStop(0, `rgb(${base[0] * 0.7},${base[1] * 0.7},${base[2] * 0.7})`)
        grad.addColorStop(0.55, `rgb(${base[0]},${base[1]},${base[2]})`)
        grad.addColorStop(1, `rgb(${Math.min(255, base[0] * 1.12)},${base[1] * 1.1},${base[2] * 1.05})`)
      }
      g.fillStyle = grad
      g.beginPath()
      // a scalloped tile: square top, round bottom edge, slightly overlapping the row below
      const pad = 2
      g.moveTo(x + pad, y)
      g.lineTo(x + cw - pad, y)
      g.lineTo(x + cw - pad, y + rh * 0.62)
      g.quadraticCurveTo(x + cw - pad, y + rh * 1.12, x + cw / 2, y + rh * 1.12)
      g.quadraticCurveTo(x + pad, y + rh * 1.12, x + pad, y + rh * 0.62)
      g.closePath()
      g.fill()
      if (!bump) {
        // weathering specks
        for (let k = 0; k < 6; k++) {
          g.fillStyle = `rgba(${r() > 0.5 ? '255,220,190' : '60,20,10'},${0.05 + r() * 0.08})`
          g.beginPath()
          g.arc(x + r() * cw, y + r() * rh, 1 + r() * 3, 0, Math.PI * 2)
          g.fill()
        }
      }
    }
  }
}

export const roofTileMap = () => paint('roof', 512, 512, (g) => drawRoofTiles(g, false))
export const roofTileBump = () => paint('roof-bump', 512, 512, (g) => drawRoofTiles(g, true), { color: false })

/** Fine grain for sand, plaster and rock bump maps */
export const grainBump = () =>
  paint(
    'grain',
    256,
    256,
    (g) => {
      const r = rng(3)
      g.fillStyle = '#808080'
      g.fillRect(0, 0, 256, 256)
      for (let i = 0; i < 5000; i++) {
        const v = Math.round(90 + r() * 90)
        g.fillStyle = `rgba(${v},${v},${v},0.55)`
        g.fillRect(r() * 256, r() * 256, 1 + r() * 2, 1 + r() * 2)
      }
    },
    { color: false }
  )

/** Speckled sand colour, tinted by the beach's vertex colours */
export const sandMap = () =>
  paint('sand', 256, 256, (g) => {
    const r = rng(11)
    g.fillStyle = '#f4ecdd'
    g.fillRect(0, 0, 256, 256)
    for (let i = 0; i < 3500; i++) {
      const dark = r() > 0.55
      g.fillStyle = dark ? `rgba(150,110,70,${0.08 + r() * 0.15})` : `rgba(255,255,245,${0.2 + r() * 0.3})`
      g.fillRect(r() * 256, r() * 256, 1 + r() * 1.5, 1 + r() * 1.5)
    }
  })

/** Dressed stone courses for the lighthouse foundation */
function drawStones(g: CanvasRenderingContext2D, bump: boolean) {
  const r = rng(5)
  g.fillStyle = bump ? '#000' : '#6a6862'
  g.fillRect(0, 0, 512, 128)
  const rows = 4
  const rh = 128 / rows
  for (let row = 0; row < rows; row++) {
    let x = row % 2 ? -20 : 0
    while (x < 512) {
      const w = 34 + r() * 36
      const v = bump ? 200 + r() * 55 : 135 + r() * 35
      g.fillStyle = bump ? `rgb(${v},${v},${v})` : `rgb(${v + 6},${v + 2},${v - 4})`
      g.beginPath()
      g.roundRect(x + 2, row * rh + 2, w - 4, rh - 4, 4)
      g.fill()
      x += w
    }
  }
}
export const stoneMap = () => paint('stone', 512, 128, (g) => drawStones(g, false))
export const stoneBump = () => paint('stone-bump', 512, 128, (g) => drawStones(g, true), { color: false })

/** Planks running along u */
export const woodMap = () =>
  paint('wood', 256, 256, (g) => {
    const r = rng(9)
    const planks = 6
    const ph = 256 / planks
    for (let i = 0; i < planks; i++) {
      const s = 0.85 + r() * 0.25
      g.fillStyle = `rgb(${Math.round(205 * s)},${Math.round(116 * s)},${Math.round(56 * s)})`
      g.fillRect(0, i * ph, 256, ph)
      for (let k = 0; k < 14; k++) {
        g.strokeStyle = `rgba(90,40,10,${0.08 + r() * 0.1})`
        g.lineWidth = 1
        const y = i * ph + r() * ph
        g.beginPath()
        g.moveTo(0, y)
        g.bezierCurveTo(80, y + (r() - 0.5) * 6, 170, y + (r() - 0.5) * 6, 256, y)
        g.stroke()
      }
      g.fillStyle = 'rgba(60,25,8,0.55)'
      g.fillRect(0, i * ph, 256, 2)
    }
  })

/** A soft cumulus puff for the volumetric cloud sprites */
let cloudUrl: string | null = null
export function cloudPuffUrl() {
  if (cloudUrl) return cloudUrl
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const g = c.getContext('2d')!
  const r = rng(21)
  for (let i = 0; i < 46; i++) {
    const a = r() * Math.PI * 2
    const d = Math.pow(r(), 0.8) * 62
    const x = 128 + Math.cos(a) * d
    const y = 128 + Math.sin(a) * d * 0.8
    const rad = 22 + r() * 30
    const grad = g.createRadialGradient(x, y, 0, x, y, rad)
    grad.addColorStop(0, 'rgba(255,255,255,0.45)')
    grad.addColorStop(0.55, 'rgba(255,255,255,0.26)')
    grad.addColorStop(0.85, 'rgba(255,255,255,0.06)')
    grad.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = grad
    g.beginPath()
    g.arc(x, y, rad, 0, Math.PI * 2)
    g.fill()
  }
  cloudUrl = c.toDataURL()
  return cloudUrl
}

/** Charcoal studio backdrop: dark at the top, lifting to a soft gray at the floor */
export const studioBackdrop = () =>
  paint(
    'backdrop',
    8,
    512,
    (g) => {
      const grad = g.createLinearGradient(0, 0, 0, 512)
      grad.addColorStop(0, '#16191b')
      grad.addColorStop(0.45, '#2a2e31')
      grad.addColorStop(1, '#5d6264')
      g.fillStyle = grad
      g.fillRect(0, 0, 8, 512)
    },
    { repeat: false }
  )
