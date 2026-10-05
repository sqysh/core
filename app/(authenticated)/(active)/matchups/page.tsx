import { auth } from '@/lib/auth/auth'
import { redirect } from 'next/navigation'
import prisma from '@/prisma/client'
import { chapterId } from '@/lib/constants/api/chapterId'
import MatchupsClient from './MatchupsClient'

export const dynamic = 'force-dynamic'

export default async function MatchupsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const start = new Date()
  start.setHours(0, 0, 0, 0)

  const parleys = await prisma.parley.findMany({
    where: { chapterId, createdAt: { gte: start }, notes: 'Auto-matched weekly 1-2-1' },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      requester: { select: { id: true, name: true, company: true, profileImage: true } },
      recipient: { select: { id: true, name: true, company: true, profileImage: true } }
    }
  })

  if (!parleys.length) redirect('/dashboard')

  return <MatchupsClient pairs={parleys} isSuperUser={session.user.role === 'SUPER_USER'} />
}
