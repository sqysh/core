import { auth } from '@/lib/auth/auth'
import { redirect } from 'next/navigation'
import prisma from '@/prisma/client'
import { chapterId } from '@/lib/constants/api/chapterId'
import JudgeClient from './JudgeClient'

export const dynamic = 'force-dynamic'

export default async function JudgePage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const today = new Date()
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)

  const round = await prisma.guidingLight.findFirst({
    where: {
      chapterId,
      status: 'OPEN',
      meetingDate: { gte: startOfDay, lt: endOfDay }
    },
    select: {
      id: true,
      judgedById: true,
      nominees: { select: { userId: true } }
    }
  })

  if (!round || round.judgedById !== session.user.id) redirect('/dashboard')

  const members = await prisma.user.findMany({
    where: { chapterId, membershipStatus: 'ACTIVE', NOT: { id: session.user.id } },
    select: {
      id: true,
      name: true,
      company: true,
      profileImage: true
    },
    orderBy: { name: 'asc' }
  })

  const initialNominees = round.nominees.map((n) => n.userId)

  return <JudgeClient roundId={round.id} members={members} initialNominees={initialNominees} />
}
