'use client'

import { useEffect } from 'react'
import { reportError } from '@/lib/utils/reportError'

// The last resort, when the root layout itself fails: it replaces the whole document, so it brings its own html and
// body and plain styles (the site's stylesheet may not be there). Reports what happened.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportError('global-error', error, { digest: error.digest })
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#050d17',
          color: '#fff',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          textAlign: 'center',
          padding: 24
        }}
      >
        <p style={{ margin: 0, fontSize: 11, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#38bdf8' }}>
          Coastal Referral Exchange
        </p>
        <h1 style={{ margin: '16px 0 0', fontSize: 30, fontWeight: 900 }}>Something went wrong</h1>
        <p style={{ margin: '12px 0 0', maxWidth: 360, color: 'rgba(255,255,255,0.6)' }}>
          The site hit a problem loading. Try again, and if it keeps happening let us know.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            marginTop: 28,
            height: 44,
            padding: '0 24px',
            border: 0,
            background: '#fff',
            color: '#050d17',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          Try again
        </button>
      </body>
    </html>
  )
}
