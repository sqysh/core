'use server'

import { auth } from '@/app/lib/auth'
import prisma from '@/prisma/client'
import { createLog } from '@/app/lib/utils/api/createLog'
import { revalidatePath } from 'next/cache'

/**
 * Removes a sign-in email from the signed-in user's account.
 * Refuses to remove the last one — that would lock them out, since
 * Google sign-in is the only way in.
 */
export async function removeUserEmail(emailId: string) {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: 'Unauthorized' }
  if (!emailId) return { success: false, error: 'Email ID is required.' }

  try {
    const record = await prisma.userEmail.findUnique({
      where: { id: emailId },
      select: { id: true, email: true, userId: true }
    })

    if (!record) return { success: false, error: 'Email not found.' }
    if (record.userId !== session.user.id) {
      return { success: false, error: 'Unauthorized' }
    }

    // Lockout guard — Google sign-in is the only route in
    const count = await prisma.userEmail.count({ where: { userId: session.user.id } })
    if (count <= 1) {
      return {
        success: false,
        error: 'You need at least one Google account to sign in. Add another before removing this one.'
      }
    }

    await prisma.userEmail.delete({ where: { id: emailId } })

    await createLog('info', `Sign-in email removed — ${record.email}`, {
      location: ['server action - removeUserEmail'],
      name: 'UserEmailRemoved',
      timestamp: new Date().toISOString(),
      userId: session.user.id,
      email: record.email
    })

    revalidatePath('/profile')
    return { success: true }
  } catch (error) {
    await createLog('error', 'Failed to remove sign-in email', {
      location: ['server action - removeUserEmail'],
      name: 'RemoveUserEmailError',
      timestamp: new Date().toISOString(),
      userId: session.user.id,
      error: error instanceof Error ? error.message : String(error)
    })
    return { success: false, error: 'Could not remove that email. Please try again.' }
  }
}
