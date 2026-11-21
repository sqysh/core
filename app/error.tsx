'use client'

import { useEffect } from 'react'
import { reportError } from '@/lib/utils/reportError'

// When a page throws, this takes its place inside the site's layout (instead of Next's bare "This page couldn't load")
// and reports what went wrong, so it shows up in the production logs.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportError('error-page', error, { digest: error.digest })
  }, [error])

  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center bg-bg-dark px-6 py-20 text-center text-white">
      <p className="m-0 font-mono text-[10px] uppercase tracking-[0.3em] text-sky-400">Coastal Referral Exchange</p>
      <h1 className="m-0 mt-4 font-sora text-3xl font-black tracking-tight sm:text-4xl">Something went wrong</h1>
      <p className="m-0 mt-3 max-w-sm font-nunito text-white/60">
        This page hit a problem loading. Try again, and if it keeps happening let us know.
      </p>
      <div className="mt-8 flex gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="h-11 bg-white px-6 font-bold text-bg-dark transition-colors hover:bg-white/90"
        >
          Try again
        </button>
        <button
          type="button"
          onClick={() => window.history.back()}
          className="h-11 border border-white/40 px-6 font-bold text-white/80 transition-colors hover:bg-white/10"
        >
          Go back
        </button>
      </div>
    </main>
  )
}
