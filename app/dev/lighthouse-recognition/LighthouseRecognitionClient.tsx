'use client'

import { useEffect, useRef, useState } from 'react'
import { useCamera } from './_hooks/useCamera'
import { findBest, Match, Template } from './_lib/matcher'
import { cropToDataUrl, loadReference, saveReference, templateFrom } from './_lib/reference'

// EXPERIMENT: can the phone recognise the check-in lighthouse on the TV, as an alternative to a QR code? Everything runs
// on the phone: a reference picture of the rendered lighthouse (captured here through the camera, or uploaded) becomes
// an edge-direction template, and every frame is searched for it at a range of sizes. Development only; nothing here
// is connected to attendance or anything else.

/** Frames are analysed at most this many pixels on their long side */
const ANALYSIS = 640
/** Matches in a row needed before it counts, so one lucky frame can't trigger it */
const HITS_NEEDED = 3

/** How the video is drawn with object-fit: cover, for mapping between screen and video pixels */
function coverOf(el: HTMLVideoElement) {
  const box = el.getBoundingClientRect()
  const scale = Math.max(box.width / el.videoWidth, box.height / el.videoHeight)
  return {
    scale,
    x: (box.width - el.videoWidth * scale) / 2,
    y: (box.height - el.videoHeight * scale) / 2,
    width: box.width,
    height: box.height
  }
}

/** The capture guide on screen: a tall box in the middle, the lighthouse's shape */
const guideOf = (w: number, h: number) => {
  const gh = h * 0.6
  const gw = gh * 0.42
  return { x: (w - gw) / 2, y: (h - gh) / 2, w: gw, h: gh }
}

export default function LighthouseRecognitionClient() {
  const video = useRef<HTMLVideoElement>(null)
  const status = useCamera(video)
  const [reference, setReference] = useState<string | null>(null)
  const [template, setTemplate] = useState<Template | null>(null)
  const [capturing, setCapturing] = useState(false)
  const [threshold, setThreshold] = useState(0.55)
  const [stats, setStats] = useState<{ match: Match | null; ms: number; frame: string }>({
    match: null,
    ms: 0,
    frame: '-'
  })
  const [detected, setDetected] = useState(false)
  const [screenBox, setScreenBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const thresholdRef = useRef(threshold)
  thresholdRef.current = threshold

  // the stored reference, if this browser has one
  useEffect(() => {
    const saved = loadReference()
    if (saved) setReference(saved)
    else setCapturing(true)
  }, [])
  useEffect(() => {
    if (!reference) return
    let live = true
    void templateFrom(reference).then((t) => live && setTemplate(t))
    return () => {
      live = false
    }
  }, [reference])

  // the recognition loop: one frame at a time, the next only once this one is done
  useEffect(() => {
    if (status !== 'live' || !template || capturing || detected) return
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    let timer = 0
    let stopped = false
    let hits = 0
    const tick = () => {
      const el = video.current
      if (stopped || !ctx || !el) return
      if (el.readyState >= 2 && el.videoWidth > 0) {
        const t0 = performance.now()
        const k = Math.min(1, ANALYSIS / Math.max(el.videoWidth, el.videoHeight))
        canvas.width = Math.round(el.videoWidth * k)
        canvas.height = Math.round(el.videoHeight * k)
        ctx.drawImage(el, 0, 0, canvas.width, canvas.height)
        const match = findBest(ctx.getImageData(0, 0, canvas.width, canvas.height), template)
        const ms = Math.round(performance.now() - t0)
        setStats({ match, ms, frame: `${canvas.width}×${canvas.height} of ${el.videoWidth}×${el.videoHeight}` })
        if (match) {
          const cover = coverOf(el)
          const toScreen = cover.scale / k
          setScreenBox({
            x: cover.x + match.x * toScreen,
            y: cover.y + match.y * toScreen,
            w: match.w * toScreen,
            h: match.h * toScreen
          })
        }
        hits = match && match.score >= thresholdRef.current ? hits + 1 : 0
        if (hits >= HITS_NEEDED) {
          setDetected(true)
          return
        }
      }
      timer = window.setTimeout(tick, 60)
    }
    tick()
    return () => {
      stopped = true
      window.clearTimeout(timer)
    }
  }, [status, template, capturing, detected])

  function capture() {
    const el = video.current
    if (!el || !el.videoWidth) return
    const cover = coverOf(el)
    const g = guideOf(cover.width, cover.height)
    const url = cropToDataUrl(
      el,
      (g.x - cover.x) / cover.scale,
      (g.y - cover.y) / cover.scale,
      g.w / cover.scale,
      g.h / cover.scale
    )
    saveReference(url)
    setReference(url)
    setCapturing(false)
    setDetected(false)
  }

  async function upload(file: File) {
    const img = new Image()
    img.src = URL.createObjectURL(file)
    await img.decode()
    const url = cropToDataUrl(img, 0, 0, img.naturalWidth, img.naturalHeight)
    URL.revokeObjectURL(img.src)
    saveReference(url)
    setReference(url)
    setCapturing(false)
    setDetected(false)
  }

  const score = stats.match?.score ?? 0
  const guide = capturing && video.current ? guideOf(window.innerWidth, window.innerHeight) : null

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black text-white">
      <video ref={video} playsInline muted autoPlay className="absolute inset-0 h-full w-full object-cover" />

      {typeof status === 'object' && (
        <p className="absolute inset-x-0 top-1/3 m-0 px-8 text-center font-nunito text-[15px]">{status.error}</p>
      )}

      {/* capture: frame the lighthouse (just the lighthouse, as little sea and sky as possible) in the box */}
      {guide && (
        <div
          className="pointer-events-none absolute rounded-xl border-2 border-dashed border-amber-200"
          style={{ left: guide.x, top: guide.y, width: guide.w, height: guide.h }}
        />
      )}

      {/* where the best match is: green once it's recognised, faint while it's only a candidate */}
      {!capturing && screenBox && score > 0.2 && (
        <div
          className={`pointer-events-none absolute rounded-lg border-2 transition-colors ${
            detected ? 'border-emerald-400' : score >= threshold ? 'border-emerald-200/70' : 'border-white/35'
          }`}
          style={{ left: screenBox.x, top: screenBox.y, width: screenBox.w, height: screenBox.h }}
        />
      )}

      {detected && (
        <div className="absolute inset-x-0 top-[max(1rem,env(safe-area-inset-top))] flex justify-center">
          <p
            role="status"
            className="m-0 flex items-center gap-2 rounded-full bg-emerald-500/90 px-5 py-2.5 font-sora text-[15px] font-bold"
          >
            <span className="h-3 w-3 rounded-full bg-white" aria-hidden="true" /> Lighthouse detected
          </p>
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 grid gap-2 bg-black/60 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 font-mono text-[11px] backdrop-blur">
        {capturing ? (
          <p className="m-0 text-amber-100">Frame the lighthouse in the box, as tightly as you can, then capture.</p>
        ) : (
          <p className="m-0">
            confidence {score.toFixed(2)} (needs {threshold.toFixed(2)} for {HITS_NEEDED} frames) · {stats.ms} ms ·{' '}
            {stats.frame}
          </p>
        )}
        <label className="flex items-center gap-2">
          threshold
          <input
            type="range"
            min={0.2}
            max={0.9}
            step={0.01}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="flex-1"
          />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          {capturing ? (
            <button
              type="button"
              onClick={capture}
              className="rounded-full bg-amber-300 px-4 py-2 font-bold text-black"
            >
              Capture reference
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setCapturing(true)}
              className="rounded-full border border-white/40 px-4 py-2"
            >
              New reference
            </button>
          )}
          <label className="cursor-pointer rounded-full border border-white/40 px-4 py-2">
            Upload image
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
            />
          </label>
          {detected && (
            <button
              type="button"
              onClick={() => setDetected(false)}
              className="rounded-full bg-white px-4 py-2 font-bold text-black"
            >
              Scan again
            </button>
          )}
          {reference && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={reference} alt="Reference" className="ml-auto h-12 rounded border border-white/30" />
          )}
        </div>
      </div>
    </div>
  )
}
