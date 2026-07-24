'use server'

import { auth } from '@/app/lib/auth'
import { EMAIL_REGEX } from '../../utils/regex'
import prisma from '@/prisma/client'

export async function updateEmail(email: string): Promise<{
  success: boolean
  error?: string
}> {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: 'Unauthorized' }

  if (!email?.trim() || !EMAIL_REGEX.test(email.trim())) {
    return { success: false, error: 'Invalid email address' }
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { email: email.trim() }
    })

    return { success: true }
  } catch (err) {
    return { success: false, error: 'Failed to update email' }
  }
}
