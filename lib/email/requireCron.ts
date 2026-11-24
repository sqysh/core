import { NextRequest, NextResponse } from 'next/server'

export function isAuthorizedCron(req: NextRequest) {
  return req.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`
}

/**
 * 401 unless a non-empty CRON_SECRET is configured and presented as `Authorization: Bearer <secret>`. With no secret
 * configured nothing is authorized: an unset variable must never read as "Bearer undefined" (which a caller could
 * simply send). Used by every cron route that emails members or changes shared data.
 */
export function requireCron(req: Pick<NextRequest, 'headers'>): NextResponse | null {
  if (!process.env.CRON_SECRET?.trim() || !isAuthorizedCron(req as NextRequest))
    return new NextResponse('Unauthorized', { status: 401 })
  return null
}
