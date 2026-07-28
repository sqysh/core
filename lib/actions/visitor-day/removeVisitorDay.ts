'use server'

import prisma from '@/prisma/client'
import { auth } from '../../auth/auth'

export async function removeVisitorDay(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' }

    await prisma.visitorDay.delete({ where: { id } })
    return { success: true }
  } catch (error) {
    return { success: false, error: 'Failed to remove visitor day' }
  }
}
