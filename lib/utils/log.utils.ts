'use server'

import { headers } from 'next/headers'

export interface RequestContext {
  ip: string | null
  userAgent: string | null
  device: string | null
  browser: string | null
  os: string | null
  referer: string | null
  origin: string | null
  language: string | null
}

function parseUserAgent(ua: string | null): { device: string; browser: string; os: string } {
  if (!ua) return { device: 'Unknown', browser: 'Unknown', os: 'Unknown' }

  // Device
  const device = /mobile|android|iphone|ipad|tablet/i.test(ua)
    ? /tablet|ipad/i.test(ua)
      ? 'Tablet'
      : 'Mobile'
    : 'Desktop'

  // Browser
  const browser = /edg\//i.test(ua)
    ? 'Edge'
    : /opr\//i.test(ua)
      ? 'Opera'
      : /chrome/i.test(ua)
        ? 'Chrome'
        : /firefox/i.test(ua)
          ? 'Firefox'
          : /safari/i.test(ua)
            ? 'Safari'
            : /msie|trident/i.test(ua)
              ? 'Internet Explorer'
              : 'Unknown'

  // OS
  const os = /windows nt/i.test(ua)
    ? 'Windows'
    : /mac os x/i.test(ua)
      ? 'macOS'
      : /android/i.test(ua)
        ? 'Android'
        : /iphone|ipad|ipod/i.test(ua)
          ? 'iOS'
          : /linux/i.test(ua)
            ? 'Linux'
            : 'Unknown'

  return { device, browser, os }
}

export async function getRequestContext(): Promise<RequestContext> {
  const headersList = await headers()

  const userAgent = headersList.get('user-agent')
  const { device, browser, os } = parseUserAgent(userAgent)

  return {
    ip: headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? headersList.get('x-real-ip') ?? null,
    userAgent,
    device,
    browser,
    os,
    referer: headersList.get('referer') ?? null,
    origin: headersList.get('origin') ?? null,
    language: headersList.get('accept-language')?.split(',')[0] ?? null
  }
}

export async function buildLogMessage(action: string, actor: string, context: RequestContext): Promise<string> {
  const time = new Date().toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })

  return `${actor} ${action} on ${context.device} (${context.browser} · ${context.os}) at ${time}`
}
