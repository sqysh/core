import { auth } from '@/lib/auth/auth'
import { redirect } from 'next/navigation'
import prisma from '@/prisma/client'
import { chapterId } from '@/lib/constants/api/chapterId'
import GuidingLightDashboardClient from './GuidingLightDashboardClient'

export const dynamic = 'force-dynamic'

export default async function GuidingLightDashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const records = await prisma.guidingLight.findMany({
    where: { chapterId, status: 'REVEALED' },
    orderBy: { meetingDate: 'desc' },
    select: {
      id: true,
      meetingDate: true,
      winner: { select: { id: true, name: true, company: true, profileImage: true } },
      judgedBy: { select: { id: true, name: true, company: true, profileImage: true } }
    }
  })

  const timesWon = records.filter((r) => r.winner?.id === session.user.id).length
  const timesJudged = records.filter((r) => r.judgedBy?.id === session.user.id).length

  const serialized = records.map((r) => ({
    ...r,
    meetingDate: r.meetingDate.toISOString(),
    isMyWin: r.winner?.id === session.user.id,
    wasMyJudge: r.judgedBy?.id === session.user.id
  }))

  return <GuidingLightDashboardClient records={serialized} timesWon={timesWon} timesJudged={timesJudged} />
}
