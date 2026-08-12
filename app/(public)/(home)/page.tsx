import prisma from '@/prisma/client'
import { chapterId } from '@/lib/constants/api/chapterId'
import HomeClient from './HomeClient'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const [openRound, lastRevealed] = await Promise.all([
    prisma.guidingLight.findFirst({
      where: { chapterId, status: 'OPEN' },
      orderBy: { meetingDate: 'desc' },
      select: { judgedBy: { select: { id: true, name: true } } }
    }),
    prisma.guidingLight.findFirst({
      where: { chapterId, status: 'REVEALED' },
      orderBy: { meetingDate: 'desc' },
      select: { winner: { select: { id: true, name: true } } }
    })
  ])

  const currentJudge = openRound?.judgedBy ?? lastRevealed?.winner ?? null

  return <HomeClient currentJudge={currentJudge} />
}
