'use client'

import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { glassButton } from '@/components/_shared/LiquidGlass'

type Status = 'starting' | 'live' | { error: string }

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
 * A fullscreen live camera preview (the rear camera when there is one) with a scanning guide in the middle. The camera is
 * requested when it opens and released the moment it closes or unmounts. It draws over the page without touching it,
 * so the page and its state are exactly as they were. It only shows the picture: nothing is read from it.
 */
export function CameraOverlay({ onClose }: { onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const [status, setStatus] = useState<Status>('starting')

  useEffect(() => {
    let stream: MediaStream | null = null
    let cancelled = false

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus({ error: explain(null) })
        return
      }
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
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
      } catch (e) {
        if (!cancelled) setStatus({ error: explain(e) })
      }
    }
    void start()

    return () => {
      cancelled = true
      stream?.getTracks().forEach((t) => t.stop())
      if (video.current) video.current.srcObject = null
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const failed = typeof status === 'object'

  return (
    <div role="dialog" aria-modal="true" aria-label="Camera" className="fixed inset-0 z-110 overflow-hidden bg-black">
      <video ref={video} playsInline muted autoPlay className="absolute inset-0 h-full w-full object-cover" />

      {status === 'live' && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
          <div className="aspect-square w-[min(60vmin,320px)] rounded-3xl border-2 border-white/60" />
        </div>
      )}

      {status !== 'live' && (
        <div className="absolute inset-0 flex items-center justify-center px-8 text-center" role="status">
          <p className="m-0 max-w-sm font-nunito text-[15px] leading-snug text-white/85">
            {failed ? status.error : 'Starting the camera...'}
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
