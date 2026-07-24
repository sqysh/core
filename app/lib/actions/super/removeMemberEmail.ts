'use server'

import { auth } from '@/app/lib/auth'
import { chapterId } from '@/app/lib/constants/api/chapterId'
import prisma from '@/prisma/client'
import { createLog } from '@/app/lib/utils/api/createLog'
import { revalidatePath } from 'next/cache'

/**
 * Super-user only. Removes a sign-in email from a member's account.
 *
 * Unlike the self-service version this permits removing the last email —
 * a super user sometimes needs to clear a wrong address before adding the
 * right one. The UI warns when this would leave the member unable to sign in.
 */
export async function removeMemberEmail(emailId: string) {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: 'Unauthorized' }
  if (session.user.role !== 'SUPER_USER') {
    return { success: false, error: 'Only superusers can manage sign-in emails.' }
  }
  if (!emailId) return { success: false, error: 'Email ID is required.' }

  try {
    const record = await prisma.userEmail.findUnique({
      where: { id: emailId },
      select: {
        id: true,
        email: true,
        userId: true,
        user: { select: { name: true, chapterId: true } }
      }
    })

    if (!record) return { success: false, error: 'Email not found.' }
    if (record.user.chapterId !== chapterId) {
      return { success: false, error: 'Unauthorized' }
    }

    const remaining = await prisma.userEmail.count({ where: { userId: record.userId } })

    await prisma.userEmail.delete({ where: { id: emailId } })

    await createLog(
      remaining <= 1 ? 'warning' : 'info',
      `Sign-in email removed for ${record.user.name} — ${record.email}${
        remaining <= 1 ? ' (no sign-in accounts remain)' : ''
      }`,
      {
        location: ['server action - removeMemberEmail'],
        name: 'MemberEmailRemoved',
        timestamp: new Date().toISOString(),
        userId: record.userId,
        adminId: session.user.id,
        email: record.email,
        remainingCount: remaining - 1
      }
    )

    revalidatePath(`/super/members/${record.userId}`)
    return { success: true, remainingCount: remaining - 1 }
  } catch (error) {
    await createLog('error', 'Failed to remove member sign-in email', {
      location: ['server action - removeMemberEmail'],
      name: 'RemoveMemberEmailError',
      timestamp: new Date().toISOString(),
      adminId: session.user.id,
      error: error instanceof Error ? error.message : String(error)
    })
    return { success: false, error: 'Could not remove that email. Please try again.' }
  }
}
