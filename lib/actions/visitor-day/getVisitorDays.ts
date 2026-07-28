import prisma from '@/prisma/client'
import { auth } from '../../auth/auth'
import { chapterId } from '../../constants/api/chapterId'

export type VisitorDay = {
  id: string
  date: string
}

export async function getVisitorDays(): Promise<{
  success: boolean
  data?: VisitorDay[]
  error?: string
}> {
  try {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' }

    const days = await prisma.visitorDay.findMany({
      where: { chapterId },
      orderBy: { date: 'asc' },
      select: { id: true, date: true, presenterCompany: true, presenterName: true }
    })

    return {
      success: true,
      data: days.map((d) => ({
        id: d.id,
        date: d.date.toISOString(),
        presenterName: d.presenterName,
        presenterCompany: d.presenterCompany
      }))
    }
  } catch (error) {
    return { success: false, error: 'Failed to load visitor days' }
  }
}
