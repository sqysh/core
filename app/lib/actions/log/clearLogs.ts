'use server'

import prisma from '@/prisma/client'
import { auth } from '../../auth/auth'

export async function clearLogs(level?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth()
    if (session?.user?.role !== 'SUPER_USER') return { success: false, error: 'Unauthorized' }
    await prisma.log.deleteMany({ where: level ? { level } : {} })
    return { success: true }
  } catch {
    return { success: false, error: 'Failed to clear logs' }
  }
}
