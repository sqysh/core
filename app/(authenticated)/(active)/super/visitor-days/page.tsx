import { auth } from '@/app/lib/auth'
import { redirect } from 'next/navigation'
import prisma from '@/prisma/client'
import { chapterId } from '@/app/lib/constants/api/chapterId'
import { getCancelledMeetings } from '@/app/lib/actions/cancelled-meeting/getCancelledMeetings'
import { SuperVisitorDaysClient } from './SuperVisitorDaysClient'

export const dynamic = 'force-dynamic'

export default async function SuperVisitorDaysPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  if (session.user.role !== 'SUPER_USER') redirect('/dashboard')

  const [visitorDays, cancelledMeetings] = await Promise.all([
    prisma.visitorDay.findMany({
      where: { chapterId },
      select: {
        id: true,
        date: true,
        presenterName: true,
        presenterCompany: true
      },
      orderBy: { date: 'asc' }
    }),
    getCancelledMeetings()
  ])

  const serialized = visitorDays.map((v) => ({
    ...v,
    date: v.date.toISOString()
  }))

  return <SuperVisitorDaysClient visitorDays={serialized} cancelledDates={cancelledMeetings.data.map((c) => c.date)} />
}
