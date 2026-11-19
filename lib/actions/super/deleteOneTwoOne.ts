'use server'

import prisma from '@/prisma/client'
import { auth } from '@/lib/auth/auth'

export async function deleteOneTwoOne(id: string): Promise<{ success: boolean; error?: string }> {
  const session = await auth()
  if (session?.user?.role !== 'SUPER_USER') return { success: false, error: 'Unauthorized' }
  await prisma.oneTwoOne.delete({ where: { id } })
  return { success: true }
}
