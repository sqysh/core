'use server'

import prisma from '@/prisma/client'
import { auth } from '../../auth'

export async function deleteFace2Face(id: string): Promise<{ success: boolean; error?: string }> {
  const session = await auth()
  if (session?.user?.role !== 'SUPER_USER') return { success: false, error: 'Unauthorized' }
  await prisma.parley.delete({ where: { id } })
  return { success: true }
}
