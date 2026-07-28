'use server'

import prisma from '@/prisma/client'
import { auth } from '../../auth/auth'

export async function deleteLog(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth()
    if (session?.user?.role !== 'SUPER_USER') return { success: false, error: 'Unauthorized' }
    await prisma.log.delete({ where: { id } })
    return { success: true }
  } catch {
    return { success: false, error: 'Failed to delete log' }
  }
}
