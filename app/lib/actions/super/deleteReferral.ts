'use server'

import prisma from '@/prisma/client'
import { auth } from '../../auth'

export async function deleteReferral(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' }
    await prisma.treasureMap.delete({ where: { id } })
    return { success: true }
  } catch {
    return { success: false, error: 'Failed to delete referral' }
  }
}
