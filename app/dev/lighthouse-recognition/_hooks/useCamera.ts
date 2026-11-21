import { RefObject, useEffect, useState } from 'react'

export type CameraStatus = 'starting' | 'live' | { error: string }

/** The rear camera (default settings) into a video element, released when the component goes */
export function useCamera(video: RefObject<HTMLVideoElement | null>): CameraStatus {
  const [status, setStatus] = useState<CameraStatus>('starting')
  useEffect(() => {
    let stream: MediaStream | null = null
    let cancelled = false
    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus({ error: window.isSecureContext ? 'This browser can’t open the camera.' : 'The camera needs HTTPS.' })
        return
      }
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false
        })
        if (cancelled) return s.getTracks().forEach((t) => t.stop())
        stream = s
        if (video.current) {
          video.current.srcObject = s
          await video.current.play().catch(() => {})
        }
        setStatus('live')
      } catch (e) {
        if (!cancelled)
          setStatus({ error: e instanceof DOMException ? `${e.name}: ${e.message}` : 'The camera couldn’t start.' })
      }
    }
    void start()
    return () => {
      cancelled = true
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [video])
  return status
}
