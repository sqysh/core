'use server'

import { auth } from '@/app/lib/auth/auth'
import prisma from '@/prisma/client'

export async function updateVisitorDay({
  id,
  presenterName,
  presenterCompany
}: {
  id: string
  presenterName?: string | null
  presenterCompany?: string | null
}): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' }

    await prisma.visitorDay.update({
      where: { id },
      data: {
        presenterName: presenterName?.trim() || null,
        presenterCompany: presenterCompany?.trim() || null
      }
    })

    return { success: true }
  } catch (error) {
    return { success: false, error: 'Failed to update visitor day' }
  }
}
