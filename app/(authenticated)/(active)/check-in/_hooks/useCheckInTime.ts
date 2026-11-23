import { useState, useSyncExternalStore } from 'react'

const formatNow = () =>
  new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' })

const subscribe = () => () => {}

// Client-only so the server and first paint agree: '' on the server and during hydration, then the time of check-in
// (read once per mount, so the stamp holds still while the page stays open)
export function useCheckInTime() {
  const [snapshot] = useState(() => {
    let stamp: string | null = null
    return () => (stamp ??= formatNow())
  })
  return useSyncExternalStore(subscribe, snapshot, () => '')
}
