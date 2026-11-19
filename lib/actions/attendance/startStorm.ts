'use server'

import { auth } from '@/lib/auth/auth'
import { pusher } from '@/lib/pusher/pusher'
import { isActingHost } from '@/lib/actions/leadership/isActingHost'
import { STORM_CHANNEL, STORM_EVENT } from '@/lib/constants/storm.constants'

export async function startStorm(): Promise<{ success: boolean; error?: string }> {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return { success: false, error: 'Not signed in' }
  if (session.user.role !== 'SUPER_USER' && !(await isActingHost(userId)))
    return { success: false, error: 'Unauthorized' }

  try {
    await pusher.trigger(STORM_CHANNEL, STORM_EVENT, {})
    return { success: true }
  } catch {
    return { success: false, error: 'Could not reach the display' }
  }
}
