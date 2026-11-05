import { auth } from '@/lib/auth/auth'
import { redirect } from 'next/navigation'
import prisma from '@/prisma/client'
import { chapterId } from '@/lib/constants/api/chapterId'
import JudgeClient from './JudgeClient'

export const dynamic = 'force-dynamic'

export default async function JudgePage({ searchParams }: { searchParams: Promise<{ preview?: string }> }) {
  const { preview } = await searchParams
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

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

  // Super-user dry run: real members, fake round, no writes
  if (preview === '1' && session.user.role === 'SUPER_USER') {
    return <JudgeClient roundId="preview" members={members} initialNominees={[]} preview />
  }

  // "Today" in Eastern time, matched against rounds stored at noon UTC on their meeting date
  const todayISO = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date())
  const startOfDay = new Date(`${todayISO}T00:00:00Z`)
  const endOfDay = new Date(startOfDay.getTime() + 86_400_000)

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

  const initialNominees = round.nominees.map((n) => n.userId)

  return <JudgeClient roundId={round.id} members={members} initialNominees={initialNominees} />
}
