'use server'

import { headers } from 'next/headers'
import { auth } from '@/lib/auth/auth'
import prisma from '@/prisma/client'

// Errors from visitors' browsers, written to the Log table. Vercel only sees the server, so without this a failure
// that happens on one kind of phone (a WebGL scene that can't start, an API an older iOS lacks) leaves no trace.
// Open to everyone (the home page is public), so it's capped: short fields, and a few reports per address a minute.

export type ClientErrorReport = {
  /** Where it was caught: 'window', 'promise', 'error-page', 'global-error', 'spline:hero', ... */
  source: string
  message: string
  stack?: string
  url?: string
  /** Next's server error digest, when there is one */
  digest?: string
}

const PER_MINUTE = 8
const recent = new Map<string, { at: number; n: number }>()
const cut = (s: unknown, n: number) => (typeof s === 'string' ? s.slice(0, n) : undefined)

export async function reportClientError(report: ClientErrorReport): Promise<void> {
  try {
    const h = await headers()
    const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    const now = Date.now()
    const r = recent.get(ip)
    if (r && now - r.at < 60_000) {
      if (++r.n > PER_MINUTE) return
    } else recent.set(ip, { at: now, n: 1 })
    if (recent.size > 5000) recent.clear()

    const session = await auth().catch(() => null)
    const userId = session?.user?.id
    await prisma.log.create({
      data: {
        level: 'error',
        message: `client: ${cut(report.source, 40) ?? 'unknown'}: ${cut(report.message, 300) ?? ''}`,
        metadata: {
          source: cut(report.source, 40),
          message: cut(report.message, 1000),
          stack: cut(report.stack, 4000),
          url: cut(report.url, 500),
          digest: cut(report.digest, 100),
          userAgent: cut(h.get('user-agent'), 400)
        },
        ...(userId ? { user: { connect: { id: userId } } } : {})
      }
    })
  } catch {
    // reporting must never become an error of its own
  }
}
