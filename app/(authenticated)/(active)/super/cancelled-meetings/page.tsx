import { auth } from '@/lib/auth/auth'
import { redirect } from 'next/navigation'
import prisma from '@/prisma/client'
import { chapterId } from '@/lib/constants/api/chapterId'
import { SuperCancelledMeetingsClient } from './SuperCancelledMeetingsClient'

export const dynamic = 'force-dynamic'

export default async function SuperCancelledMeetingsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  if (session.user.role !== 'SUPER_USER') redirect('/dashboard')

  const cancelledMeetings = await prisma.cancelledMeeting.findMany({
    where: { chapterId },
    select: {
      id: true,
      date: true,
      reason: true
    },
    orderBy: { date: 'asc' }
  })

  const serialized = cancelledMeetings.map((c) => ({
    ...c,
    date: c.date.toISOString()
  }))

  return <SuperCancelledMeetingsClient cancelledMeetings={serialized} />
}
