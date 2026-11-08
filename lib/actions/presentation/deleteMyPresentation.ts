'use server'

import { auth } from '@/lib/auth/auth'
import { chapterId } from '@/lib/constants/api/chapterId'
import { nextMeetingDate } from '@/lib/utils/date.utils'
import prisma from '@/prisma/client'
import { revalidatePath } from 'next/cache'

export async function deleteMyPresentation(): Promise<{ success: boolean; error?: string }> {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: 'Not signed in' }
  const { date: meetingDate } = await nextMeetingDate()
  try {
    await prisma.presentation.deleteMany({ where: { chapterId, meetingDate, presenterId: session.user.id } })
    revalidatePath('/dashboard')
    return { success: true }
  } catch {
    return { success: false, error: 'Could not remove it' }
  }
}
