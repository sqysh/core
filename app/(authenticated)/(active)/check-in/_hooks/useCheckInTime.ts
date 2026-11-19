import { useEffect, useState } from 'react'

// Client-only so the server and first paint agree
export function useCheckInTime() {
  const [stamp, setStamp] = useState('')

  useEffect(() => {
    setStamp(
      new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' })
    )
  }, [])

  return stamp
}
