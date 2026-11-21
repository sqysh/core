import { NextRequest } from 'next/server'
import { handlers } from '@/lib/auth/auth'

/**
 * In development, Next gives route handlers a URL built from the address the dev server is bound to (0.0.0.0 or
 * localhost), not the one the browser used. Auth.js builds the magic link, callbacks and redirects from that URL, so a
 * phone signing in over Wi-Fi was sent a link to an address it can't open. Here the origin is set back to the host
 * the request actually came in on (http://<this Mac's LAN address>:3000), the way a reverse proxy would. Nothing about
 * sign-in itself changes. Production requests pass straight through.
 */
function withRequestOrigin(req: NextRequest) {
  if (process.env.NODE_ENV !== 'development') return req
  const host = req.headers.get('host')
  const url = new URL(req.url)
  if (!host || url.host === host) return req
  url.host = host
  return new NextRequest(url, req)
}

export const GET = (req: NextRequest) => handlers.GET(withRequestOrigin(req))
export const POST = (req: NextRequest) => handlers.POST(withRequestOrigin(req))
