import { auth } from '@/lib/auth/auth'
import prisma from '@/prisma/client'

// Who may use member-only features, decided from the database, not the session: the session token only carries the
// member's id, role and isMembership flag, never their membership status, so a check on session.user.membershipStatus
// can't pass for anyone. This is the same rule the (active) layout applies before it shows a page: a signed-in user
// whose membership status is ACTIVE.

/** The same result either way, so callers can read `ok` without narrowing (the project doesn't run strict null checks) */
export type ActiveMember = {
  ok: boolean
  userId?: string
  role?: string
  /** Why not, in words a member can read */
  error?: string
  reason?: 'no-session' | 'not-found' | 'inactive'
  status?: string
}

export async function requireActiveMember(): Promise<ActiveMember> {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return { ok: false, error: 'Not signed in', reason: 'no-session' }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, membershipStatus: true } })
  if (!user) return { ok: false, error: 'We couldn’t find your member account', reason: 'not-found', userId }
  if (user.membershipStatus !== 'ACTIVE')
    return {
      ok: false,
      error: 'Boats are for active members. Your membership isn’t active right now.',
      reason: 'inactive',
      userId,
      status: user.membershipStatus
    }
  return { ok: true, userId, role: user.role }
}
