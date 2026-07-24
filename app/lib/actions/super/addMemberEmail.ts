'use server'

import { auth } from '@/app/lib/auth'
import { chapterId } from '@/app/lib/constants/api/chapterId'
import prisma from '@/prisma/client'
import { createLog } from '@/app/lib/utils/api/createLog'
import { revalidatePath } from 'next/cache'

const GOOGLE_CONSUMER_DOMAINS = ['gmail.com', 'googlemail.com']

/**
 * Super-user only. Adds a Google sign-in email to another member's account.
 * Used during onboarding and for members who cannot sign in to add one themselves.
 */
export async function addMemberEmail(userId: string, rawEmail: string) {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: 'Unauthorized' }
  if (session.user.role !== 'SUPER_USER') {
    return { success: false, error: 'Only superusers can manage sign-in emails.' }
  }
  if (!userId) return { success: false, error: 'User ID is required.' }

  const email = rawEmail.trim().toLowerCase()

  if (!email) return { success: false, error: 'Enter an email address.' }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: 'That does not look like a valid email address.' }
  }

  const isWorkspace = !GOOGLE_CONSUMER_DOMAINS.includes(email.split('@')[1])

  try {
    const member = await prisma.user.findFirst({
      where: { id: userId, chapterId },
      select: { id: true, name: true }
    })
    if (!member) return { success: false, error: 'Member not found.' }

    // Taken as another member's display email, or already registered anywhere
    const [takenAsPrimary, takenAsSignIn] = await Promise.all([
      prisma.user.findFirst({ where: { email }, select: { id: true, name: true } }),
      prisma.userEmail.findUnique({
        where: { email },
        select: { userId: true, user: { select: { name: true } } }
      })
    ])

    if (takenAsPrimary && takenAsPrimary.id !== userId) {
      return { success: false, error: `That is ${takenAsPrimary.name}'s display email.` }
    }
    if (takenAsSignIn) {
      return takenAsSignIn.userId === userId
        ? { success: false, error: 'That email is already on this account.' }
        : { success: false, error: `That email already signs in ${takenAsSignIn.user.name}.` }
    }

    await prisma.userEmail.create({ data: { userId, email } })

    await createLog('info', `Sign-in email added for ${member.name} — ${email}`, {
      location: ['server action - addMemberEmail'],
      name: 'MemberEmailAdded',
      timestamp: new Date().toISOString(),
      userId,
      adminId: session.user.id,
      email,
      isWorkspace
    })

    revalidatePath(`/super/members/${userId}`)
    return { success: true, isWorkspace }
  } catch (error) {
    await createLog('error', 'Failed to add member sign-in email', {
      location: ['server action - addMemberEmail'],
      name: 'AddMemberEmailError',
      timestamp: new Date().toISOString(),
      userId,
      adminId: session.user.id,
      error: error instanceof Error ? error.message : String(error)
    })
    return { success: false, error: 'Could not add that email. Please try again.' }
  }
}
