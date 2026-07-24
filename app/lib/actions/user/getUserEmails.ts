'use server'

import { auth } from '@/app/lib/auth'
import prisma from '@/prisma/client'
import { createLog } from '@/app/lib/utils/api/createLog'

export interface UserEmailItem {
  id: string
  email: string
  createdAt: string
}

export async function getUserEmails(): Promise<{
  success: boolean
  data?: UserEmailItem[]
  error?: string
}> {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: 'Unauthorized' }

  try {
    const emails = await prisma.userEmail.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'asc' },
      select: { id: true, email: true, createdAt: true }
    })

    return {
      success: true,
      data: emails.map((e) => ({ ...e, createdAt: e.createdAt.toISOString() }))
    }
  } catch (error) {
    await createLog('error', 'Failed to load sign-in emails', {
      location: ['server action - getUserEmails'],
      name: 'GetUserEmailsError',
      timestamp: new Date().toISOString(),
      userId: session.user.id,
      error: error instanceof Error ? error.message : String(error)
    })
    return { success: false, error: 'Failed to load sign-in emails' }
  }
}
