'use client'

import { useEffect, useRef, useState } from 'react'
import { AlertCircle, Check, Loader2, X } from 'lucide-react'
import { glassButton } from '@/components/_shared/LiquidGlass'
import { haptics } from '@/lib/utils/haptics'
import { DECODE_METHODS, DecodeMethod } from '@/lib/utils/qrDecoder'

type Status = 'starting' | 'live' | { error: string }

/** What became of a scan, as the owner of the overlay decides it (e.g. a check-in), shown under the guide */
export type ScanOutcome = { tone: 'ok' | 'error'; text: string }

/** Why the camera can't be had, in words a member can act on */
function explain(e: unknown): string {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return window.isSecureContext
      ? 'This browser can’t open the camera.'
      : 'The camera needs a secure (HTTPS) connection, and this page isn’t on one.'
  }
  const name = e instanceof DOMException ? e.name : ''
  if (name === 'NotAllowedError' || name === 'SecurityError')
    return 'Camera access was denied. Allow the camera for CORE in your browser or device settings, then try again.'
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'No camera was found on this device.'
  if (name === 'NotReadableError' || name === 'AbortError') return 'The camera is in use by another app.'
  return 'The camera couldn’t be started.'
}

/**
 * The decoder-comparison controls, timings and decoded text are for development only. Outside development the overlay
 * always reads the standard way (the original 640 px decoder on the default camera), shows the scan guide and the
 * confirmation, and nothing decoded is displayed.
 */
const DEV = process.env.NODE_ENV === 'development'
/** Between reads (ms) */
const SCAN_EVERY = 100

/**
 * A fullscreen live camera preview (the rear camera when there is one) with a scanning guide in the middle, reading QR
 * codes from it as they come into view (jsQR, which is plain JavaScript and so works in iOS Safari and installed apps
 * alike). No button is needed: the first code found ends the scan. The camera is released at once, the scan is
 * confirmed with a buzz (where the device has one) and on screen, and `onDetect` gets the text. If `onDetect` returns
 * an outcome (or a promise of one), the overlay waits for it and shows it: green for ok, amber for an error, with a
 * matching buzz. Nothing decoded is ever opened or followed here. The camera is requested when the overlay opens and released when it closes or
 * unmounts, and the page underneath is never touched.
 */
export function CameraOverlay({
  onClose,
  onDetect
}: {
  onClose: () => void
  /** Gets the text of the code that was read, once per scan; may answer with what became of it */
  onDetect?: (text: string) => ScanOutcome | void | Promise<ScanOutcome | void>
}) {
  const video = useRef<HTMLVideoElement>(null)
  const [status, setStatus] = useState<Status>('starting')
  // the text of the code that was read (while this is set the camera is off); Scan Again clears it
  const [result, setResult] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  // what became of the scan: undefined while it's being dealt with, null when nobody said
  const [outcome, setOutcome] = useState<ScanOutcome | null | undefined>(null)
  // TEMPORARY, for testing: which way of reading found it
  // TEMPORARY: which way of reading to use (only that one runs), the camera mode, and what the last read cost
  const [via, setVia] = useState('')
  const [method, setMethod] = useState<DecodeMethod>('original')
  const [hiRes, setHiRes] = useState(false)
  const [stats, setStats] = useState({ camera: '-', decoding: '-', ms: 0 })
  const methodRef = useRef(method)
  methodRef.current = method
  const latest = useRef(onDetect)
  latest.current = onDetect

  useEffect(() => {
    let stream: MediaStream | null = null
    let timer = 0
    let cancelled = false
    let handled = false

    const release = () => {
      window.clearTimeout(timer)
      stream?.getTracks().forEach((t) => t.stop())
      stream = null
      if (video.current) video.current.srcObject = null
    }

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    const tick = () => {
      const el = video.current
      if (cancelled || handled || !ctx) return
      if (el && el.readyState >= 2 && el.videoWidth > 0) {
        const m = DECODE_METHODS[methodRef.current]
        const t0 = performance.now()
        const scale = Math.min(1, m.width / el.videoWidth)
        canvas.width = Math.round(el.videoWidth * scale)
        canvas.height = Math.round(el.videoHeight * scale)
        ctx.drawImage(el, 0, 0, canvas.width, canvas.height)
        const frame = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const code = m.run(frame)
        if (DEV)
          setStats({
            camera: `${el.videoWidth}×${el.videoHeight}`,
            decoding: `${canvas.width}×${canvas.height}`,
            ms: Math.round(performance.now() - t0)
          })
        // the first code ends the scan: later frames can't report it again
        if (code) {
          handled = true
          release()
          setResult(code)
          setVia(m.label)
          const answer = latest.current?.(code)
          if (answer instanceof Promise) {
            setOutcome(undefined)
            answer.then(
              (o) => !cancelled && setOutcome(o || null),
              () => !cancelled && setOutcome({ tone: 'error', text: 'Something went wrong. Please try again.' })
            )
          } else setOutcome(answer || null)
          return
        }
      }
      timer = window.setTimeout(tick, SCAN_EVERY)
    }

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus({ error: explain(null) })
        return
      }
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: hiRes
            ? { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }
            : { facingMode: { ideal: 'environment' } },
          audio: false
        })
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop())
          return
        }
        stream = s
        const el = video.current
        if (el) {
          el.srcObject = s
          await el.play().catch(() => {})
        }
        setStatus('live')
        tick()
      } catch (e) {
        if (!cancelled) setStatus({ error: explain(e) })
      }
    }
    void start()

    return () => {
      cancelled = true
      release()
    }
  }, [attempt, hiRes])

  // a code was read: buzz where the device can, and always show it (many phones can't buzz)
  // confirm once it's settled: a buzz to match the outcome (where the device can), and always on screen
  useEffect(() => {
    if (result === null || outcome === undefined) return
    if (outcome?.tone === 'error') haptics.error()
    else haptics.success()
  }, [result, outcome])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const failed = typeof status === 'object'
  const detected = result !== null
  const pending = detected && outcome === undefined
  const bad = detected && outcome?.tone === 'error'

  return (
    <div role="dialog" aria-modal="true" aria-label="Camera" className="fixed inset-0 z-110 overflow-hidden bg-black">
      <video ref={video} playsInline muted autoPlay className="absolute inset-0 h-full w-full object-cover" />

      {(status === 'live' || detected) && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
          <div
            className={`flex aspect-square w-[min(60vmin,320px)] items-center justify-center rounded-3xl border-2 transition-colors duration-300 ${
              pending
                ? 'border-white/80 bg-white/10'
                : bad
                  ? 'border-amber-300 bg-amber-300/15'
                  : detected
                    ? 'border-emerald-300 bg-emerald-300/15'
                    : 'border-white/60'
            }`}
          >
            {pending && <Loader2 size={44} className="animate-spin text-white" aria-hidden="true" />}
            {bad && <AlertCircle size={56} className="text-amber-200" aria-hidden="true" />}
            {detected && !pending && !bad && <Check size={56} className="text-emerald-200" aria-hidden="true" />}
          </div>
        </div>
      )}

      {status !== 'live' && !detected && (
        <div className="absolute inset-0 flex items-center justify-center px-8 text-center" role="status">
          <p className="m-0 max-w-sm font-nunito text-[15px] leading-snug text-white/85">
            {failed ? status.error : 'Starting the camera...'}
          </p>
        </div>
      )}

      {/* TEMPORARY, for testing: what was read, shown as plain text (never opened) */}
      {detected && (
        <div
          role="status"
          className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
        >
          {pending && <p className="m-0 font-nunito text-[15px] text-white">Checking...</p>}
          {outcome && (
            <p
              className={`m-0 max-w-md rounded-2xl px-4 py-2.5 text-center font-nunito text-[15px] font-semibold ${
                outcome.tone === 'ok' ? 'bg-emerald-500/85 text-white' : 'bg-amber-400/90 text-[#1f1300]'
              }`}
            >
              {outcome.text}
            </p>
          )}
          {DEV && (
            <p className="m-0 max-h-[30dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-white/30 bg-[#06182c]/75 px-4 py-3 text-left font-mono text-[12px] break-all text-white select-text">
              {result}
              <span className="mt-1 block text-white/50">read: {via}</span>
            </p>
          )}
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setResult(null)
              setOutcome(null)
              setStatus('starting')
              setAttempt((a) => a + 1)
            }}
            className={`${glassButton('primary')} h-11 px-6 text-[14px]`}
          >
            Scan again
          </button>
        </div>
      )}

      {/* TEMPORARY, development only: choose how codes are read (only that runs) and see what it costs */}
      {DEV && (
        <div className="absolute left-[max(1rem,env(safe-area-inset-left))] top-[max(1rem,env(safe-area-inset-top))] grid max-w-[min(70vw,22rem)] gap-1.5 rounded-2xl border border-white/30 bg-[#06182c]/75 p-2 font-mono text-[11px] text-white">
          <div className="flex flex-wrap gap-1">
            {(Object.keys(DECODE_METHODS) as DecodeMethod[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setMethod(k)}
                className={`rounded-lg border px-2 py-1 ${method === k ? 'border-sky-200/70 bg-sky-400/30' : 'border-white/25'}`}
              >
                {DECODE_METHODS[k].label}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            {[false, true].map((hi) => (
              <button
                key={String(hi)}
                type="button"
                onClick={() => {
                  setHiRes(hi)
                  setStatus('starting')
                }}
                className={`rounded-lg border px-2 py-1 ${hiRes === hi ? 'border-sky-200/70 bg-sky-400/30' : 'border-white/25'}`}
              >
                {hi ? 'Camera 1080p' : 'Camera default'}
              </button>
            ))}
          </div>
          <p className="m-0 text-white/80">
            camera {stats.camera} · decoding {stats.decoding} · {stats.ms} ms
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={onClose}
        aria-label="Close the camera"
        className={`${glassButton()} absolute! h-11 w-11 rounded-full border-white/40! bg-[#06182c]/60! right-[max(1rem,env(safe-area-inset-right))] top-[max(1rem,env(safe-area-inset-top))]`}
      >
        <X size={20} aria-hidden="true" />
      </button>
    </div>
  )
}
