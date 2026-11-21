'use client'

import { useEffect } from 'react'
import { reportError } from '@/lib/utils/reportError'

// Listens for anything that escapes the app's own handling (an uncaught error, a rejected promise nobody awaited) and
// sends it to the server log, so failures on visitors' devices are visible in production.
export function ClientErrorReporter() {
  useEffect(() => {
    const onError = (e: ErrorEvent) => reportError('window', e.error ?? e.message)
    const onRejection = (e: PromiseRejectionEvent) => reportError('promise', e.reason)
    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)
    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
    }
  }, [])
  return null
}
