'use server'

import prisma from '@/prisma/client'
import { auth } from '../../auth/auth'
import { chapterId } from '../../constants/api/chapterId'

export async function addVisitorDay(date: string): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' }

    await prisma.visitorDay.create({
      data: { date: new Date(date), chapterId }
    })

    return { success: true }
  } catch (error) {
    return { success: false, error: 'Failed to add visitor day' }
  }
}
