'use client'

import { reportClientError } from '@/lib/actions/log/reportClientError'

// Sends a browser error to the server log, at most a handful per page load and never the same one twice.

const MAX_PER_PAGE = 5
const sent = new Set<string>()

/** Noise that isn't ours to fix: browser extensions, cross-origin scripts with no detail, a benign layout warning */
const IGNORE = [/ResizeObserver loop/i, /^Script error\.?$/i, /extension:\/\//i]

export function reportError(source: string, error: unknown, extra: { digest?: string } = {}) {
  try {
    const err = error instanceof Error ? error : new Error(typeof error === 'string' ? error : JSON.stringify(error))
    const key = `${source}|${err.message}`
    if (
      sent.has(key) ||
      sent.size >= MAX_PER_PAGE ||
      IGNORE.some((r) => r.test(err.message) || r.test(err.stack ?? ''))
    )
      return
    sent.add(key)
    void reportClientError({
      source,
      message: err.message || err.name,
      stack: err.stack,
      url: window.location.href,
      digest: extra.digest
    }).catch(() => {})
  } catch {}
}
