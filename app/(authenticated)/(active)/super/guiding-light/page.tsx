import { auth } from '@/lib/auth/auth'
import { redirect } from 'next/navigation'
import prisma from '@/prisma/client'
import { chapterId } from '@/lib/constants/api/chapterId'
import { etDateISO } from '@/lib/utils/date.utils'
import { SuperGuidingLightClient } from './SuperGuidingLightClient'
import { displayStatus, getGuidingLightDeferral } from '@/lib/actions/guiding-light/getGuidingLightDeferral'

export const dynamic = 'force-dynamic'

export default async function SuperGuidingLightPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  if (session.user.role !== 'SUPER_USER') redirect('/dashboard')

  const records = await prisma.guidingLight.findMany({
    where: { chapterId },
    orderBy: { meetingDate: 'desc' },
    select: {
      id: true,
      meetingDate: true,
      status: true,
      winner: { select: { id: true, name: true, company: true, profileImage: true } },
      judgedBy: { select: { id: true, name: true, company: true, profileImage: true } }
    }
  })

  const deferral = await getGuidingLightDeferral()

  const members = await prisma.user.findMany({
    where: { chapterId, membershipStatus: 'ACTIVE' },
    select: {
      id: true,
      name: true,
      company: true,
      profileImage: true
    },
    orderBy: { name: 'asc' }
  })

  const todayStart = new Date(`${await etDateISO()}T00:00:00Z`)
  const serialized = records.map((r) => ({
    ...r,
    status: displayStatus(r.status, r.meetingDate, todayStart),
    meetingDate: r.meetingDate.toISOString()
  }))

  return <SuperGuidingLightClient records={serialized} members={members} deferral={deferral} />
}
