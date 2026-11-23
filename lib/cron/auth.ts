import { NextRequest } from 'next/server'
export function isAuthorizedCron(req: NextRequest) {
  return req.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`
}
