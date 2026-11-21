import { makeTemplate, CELL, Template, templateCells } from './matcher'

// The reference picture of the lighthouse: kept in this browser only (it's a development experiment), as a small JPEG.

const KEY = 'core:dev:lighthouse-reference'

export function loadReference(): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function saveReference(dataUrl: string) {
  try {
    localStorage.setItem(KEY, dataUrl)
  } catch {
    // storage unavailable (private mode): the reference still works until the page closes
  }
}

/** A drawable (a video frame region or a picture) cropped and kept as a small JPEG data URL */
export function cropToDataUrl(
  source: CanvasImageSource,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  height = 240
): string {
  const c = document.createElement('canvas')
  c.height = height
  c.width = Math.max(1, Math.round((sw / sh) * height))
  c.getContext('2d')!.drawImage(source, sx, sy, sw, sh, 0, 0, c.width, c.height)
  return c.toDataURL('image/jpeg', 0.9)
}

/** The matcher's template from a stored reference picture */
export async function templateFrom(dataUrl: string): Promise<Template> {
  const img = new Image()
  img.src = dataUrl
  await img.decode()
  const { cols, rows } = templateCells(img.naturalWidth, img.naturalHeight)
  const c = document.createElement('canvas')
  c.width = cols * CELL
  c.height = rows * CELL
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(img, 0, 0, c.width, c.height)
  return makeTemplate(ctx.getImageData(0, 0, c.width, c.height))
}
