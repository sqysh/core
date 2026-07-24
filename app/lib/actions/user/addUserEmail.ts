'use server'

import { auth } from '@/app/lib/auth'
import prisma from '@/prisma/client'
import { createLog } from '@/app/lib/utils/api/createLog'
import { revalidatePath } from 'next/cache'
import { EMAIL_REGEX } from '../../utils/regex'

const ALLOWED_DOMAINS = ['gmail.com', 'googlemail.com']

/**
 * Adds a Google-backed email to the signed-in user's account.
 * That email can then be used to sign in with Google.
 */
export async function addUserEmail(rawEmail: string) {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: 'Unauthorized' }

  const email = rawEmail.trim().toLowerCase()

  if (!email) return { success: false, error: 'Enter an email address.' }
  if (!EMAIL_REGEX.test(email)) {
    return { success: false, error: 'That does not look like a valid email address.' }
  }

  const domain = email.split('@')[1]
  const isWorkspace = !ALLOWED_DOMAINS.includes(domain)

  try {
    // Taken by another account (either as display email or sign-in email)
    const [takenAsPrimary, takenAsAlternate] = await Promise.all([
      prisma.user.findFirst({ where: { email }, select: { id: true } }),
      prisma.userEmail.findUnique({ where: { email }, select: { userId: true } })
    ])

    if (takenAsPrimary && takenAsPrimary.id !== session.user.id) {
      return { success: false, error: 'That email is already in use on another account.' }
    }
    if (takenAsAlternate) {
      return takenAsAlternate.userId === session.user.id
        ? { success: false, error: 'That email is already on your account.' }
        : { success: false, error: 'That email is already in use on another account.' }
    }

    await prisma.userEmail.create({
      data: { userId: session.user.id, email }
    })

    await createLog('info', `Sign-in email added — ${email}`, {
      location: ['server action - addUserEmail'],
      name: 'UserEmailAdded',
      timestamp: new Date().toISOString(),
      userId: session.user.id,
      email,
      isWorkspace
    })

    revalidatePath('/profile')
    return { success: true, isWorkspace }
  } catch (error) {
    await createLog('error', 'Failed to add sign-in email', {
      location: ['server action - addUserEmail'],
      name: 'AddUserEmailError',
      timestamp: new Date().toISOString(),
      userId: session.user.id,
      error: error instanceof Error ? error.message : String(error)
    })
    return { success: false, error: 'Could not add that email. Please try again.' }
  }
}
