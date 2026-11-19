import { auth } from '@/lib/auth/auth'
import { isActingHost } from '@/lib/actions/leadership/isActingHost'

// The host runs the meeting, so she can open, defer and take over the Guiding Light
// round the same as a super user.
export async function canRunRound() {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return null
  if (session.user.role === 'SUPER_USER' || (await isActingHost(userId))) return userId
  return null
}
