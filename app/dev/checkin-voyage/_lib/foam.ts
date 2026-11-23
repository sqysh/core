import { CanvasTexture, SRGBColorSpace } from 'three'

/** A soft round puff of foam with a lacy, bubbled edge: the sprite the wakes are built from */
export function foamTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 62)
  grad.addColorStop(0, 'rgba(255,255,255,0.5)')
  grad.addColorStop(0.55, 'rgba(255,255,255,0.85)')
  grad.addColorStop(0.75, 'rgba(255,255,255,0.35)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 128, 128)
  // break the ring up into lacy bubbles
  g.globalCompositeOperation = 'destination-out'
  for (let i = 0; i < 70; i++) {
    g.fillStyle = `rgba(0,0,0,${0.3 + Math.random() * 0.5})`
    g.beginPath()
    g.arc(Math.random() * 128, Math.random() * 128, 2 + Math.random() * 7, 0, Math.PI * 2)
    g.fill()
  }
  const tex = new CanvasTexture(c)
  tex.colorSpace = SRGBColorSpace
  return tex
}
