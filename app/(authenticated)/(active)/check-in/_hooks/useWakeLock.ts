import { useEffect } from 'react'

// The judge needs the phone awake until the round opens and the redirect fires
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null

    async function acquire() {
      try {
        lock = await navigator.wakeLock.request('screen')
      } catch {
        // Low battery or a backgrounded tab; nothing to do but try again on return
      }
    }

    function onVisible() {
      if (document.visibilityState === 'visible') acquire()
    }

    acquire()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      lock?.release()
    }
  }, [active])
}
