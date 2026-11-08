'use client'

import { useEffect, useRef, useState } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'

// pdfjs-dist, with the worker served from /public. After `npm i pdfjs-dist`:
//   cp node_modules/pdfjs-dist/build/pdf.worker.min.mjs public/pdf.worker.min.mjs
let pdfjsPromise: Promise<typeof import('pdfjs-dist')> | null = null
function loadPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import('pdfjs-dist').then((m) => {
      m.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
      return m
    })
  }
  return pdfjsPromise
}

export function usePdf(url: string | null) {
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setDoc(null)
    setError(null)
    if (!url) return
    loadPdfjs()
      .then((pdfjs) => pdfjs.getDocument({ url }).promise)
      .then((d) => {
        if (!cancelled) setDoc(d)
      })
      .catch(() => {
        if (!cancelled) setError('Could not open the slides')
      })
    return () => {
      cancelled = true
    }
  }, [url])

  return { doc, error }
}

/** Renders one page into a canvas, fitted inside maxW x maxH, device-pixel aware. */
export function usePdfPage(doc: PDFDocumentProxy | null, page: number, maxW: number, maxH: number) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const task = useRef<{ cancel: () => void } | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!doc || !canvas || page < 1 || page > doc.numPages) return
    let cancelled = false

    doc.getPage(page).then((p) => {
      if (cancelled) return
      const base = p.getViewport({ scale: 1 })
      const scale = Math.min(maxW / base.width, maxH / base.height)
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const vp = p.getViewport({ scale: scale * dpr })
      canvas.width = vp.width
      canvas.height = vp.height
      canvas.style.width = `${vp.width / dpr}px`
      canvas.style.height = `${vp.height / dpr}px`
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      task.current?.cancel()
      const t = p.render({ canvas, canvasContext: ctx, viewport: vp })
      task.current = t
      t.promise.catch(() => {})
    })

    return () => {
      cancelled = true
      task.current?.cancel()
    }
  }, [doc, page, maxW, maxH])

  return canvasRef
}

/** Small data-URL thumbnails for the presenter's strip. */
export function usePdfThumbs(doc: PDFDocumentProxy | null, width = 160) {
  const [thumbs, setThumbs] = useState<string[]>([])

  useEffect(() => {
    if (!doc) return
    let cancelled = false
    ;(async () => {
      const out: string[] = []
      for (let i = 1; i <= doc.numPages; i++) {
        const p = await doc.getPage(i)
        const base = p.getViewport({ scale: 1 })
        const vp = p.getViewport({ scale: width / base.width })
        const c = document.createElement('canvas')
        c.width = vp.width
        c.height = vp.height
        const ctx = c.getContext('2d')
        if (!ctx) continue
        await p.render({ canvas: c, canvasContext: ctx, viewport: vp }).promise
        const img = c.toDataURL('image/jpeg', 0.7)
        if (cancelled) return
        out.push(img)
        setThumbs([...out])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [doc, width])

  return thumbs
}
