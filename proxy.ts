import { NextRequest, NextResponse } from 'next/server'
import { auth } from './lib/auth/auth'
import { easternToday, MEETING_HOLD_ALLOWED, MEETING_HOLD_COOKIE } from './lib/constants/meeting-hold.constants'

const publicRoutes = ['/login', '/visitor', '/visitor-day', '/attendance']
const protectedAPIRoutes = ['/api/pdf/member-directory', '/billing']

export async function proxy(req: NextRequest) {
  const { nextUrl } = req

  if (
    nextUrl.pathname.startsWith('/api/auth/') ||
    nextUrl.pathname.startsWith('/api/cron/') ||
    nextUrl.pathname.startsWith('/_next') ||
    nextUrl.pathname.includes('.') ||
    nextUrl.pathname.startsWith('/icon') ||
    nextUrl.pathname.startsWith('/api/placeholder') ||
    nextUrl.pathname.startsWith('/api/webhooks/')
  ) {
    return NextResponse.next()
  }

  // The native app (Capacitor adds CORENative to its user agent) is for members: it never shows the marketing homepage (a presentation hint only, not security)
  if (nextUrl.pathname === '/' && req.headers.get('user-agent')?.includes('CORENative')) {
    return NextResponse.redirect(new URL('/mobile/launch', nextUrl))
  }

  const session = await auth()
  const isLoggedIn = !!session?.user

  // ── Checked in to today's meeting → held on the check-in screen until it ends ──
  // (the cookie is set once their boat is in the harbor and expires when the meeting does; super users are never held)
  const hold = req.cookies.get(MEETING_HOLD_COOKIE)?.value
  if (
    isLoggedIn &&
    hold === easternToday() &&
    session.user.role !== 'SUPER_USER' &&
    !MEETING_HOLD_ALLOWED.some((p) => nextUrl.pathname === p || nextUrl.pathname.startsWith(`${p}/`))
  ) {
    return NextResponse.redirect(new URL('/check-in', nextUrl))
  }

  const isPublicRoute = publicRoutes.includes(nextUrl.pathname)
  const isProtectedPage =
    nextUrl.pathname.startsWith('/dashboard') ||
    nextUrl.pathname.startsWith('/super/dashboard') ||
    nextUrl.pathname.startsWith('/election') ||
    nextUrl.pathname.startsWith('/check-in') ||
    nextUrl.pathname.startsWith('/garage')
  const isSuperUserRoute = nextUrl.pathname.startsWith('/super/dashboard')

  // ── Logged-in user hitting a public route → redirect to their home ────────
  if (isLoggedIn && isPublicRoute) {
    if (nextUrl.pathname === '/login') {
      const dest = session.user.role === 'SUPER_USER' ? '/super/dashboard' : '/dashboard'
      return NextResponse.redirect(new URL(dest, nextUrl))
    }
    return NextResponse.next()
  }

  // ── Protected page → send to login ───────────────────────────────────────
  if (isProtectedPage && !isLoggedIn) {
    const loginUrl = new URL('/login', nextUrl)
    loginUrl.searchParams.set('callbackUrl', nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  // ── Non-superuser hitting /super → back to dashboard ────────────────────
  if (isLoggedIn && isSuperUserRoute && session.user.role !== 'SUPER_USER') {
    return NextResponse.redirect(new URL('/dashboard', nextUrl))
  }

  // ── Protected API routes → 401 if not logged in ───────────────────────────
  if (protectedAPIRoutes.some((r) => nextUrl.pathname.startsWith(r)) && !isLoggedIn) {
    const signInUrl = new URL('/login', req.url)
    return NextResponse.redirect(signInUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|icon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)']
}
