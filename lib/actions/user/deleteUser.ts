'use server'

import prisma from '@/prisma/client'
import { auth } from '../../auth/auth'

export async function deleteUser(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' }

    await prisma.user.delete({ where: { id: userId } })
    return { success: true }
  } catch (error) {
    return { success: false, error: 'Failed to delete member' }
  }
}
