import { redirect } from 'next/navigation'
import { auth } from '@/app/lib/auth'
import prisma from '@/prisma/client'
import { chapterId } from '@/app/lib/constants/api/chapterId'
import VisitorsClient from './VisitorsClient'

export default async function VisitorsPage() {
  const session = await auth()
  if (!session?.user) redirect('/auth/login?callbackUrl=/visitors')

  // Get all past visitor days with their visitors
  const visitorDays = await prisma.visitorDay
    .findMany({
      where: {
        chapterId,
        date: { lt: new Date() }
      },
      orderBy: { date: 'desc' },
      select: {
        id: true,
        date: true,
        presenterName: true,
        presenterCompany: true
      }
    })
    .catch(() => [])

  const visitors = await prisma.visitor
    .findMany({
      where: { chapterId },
      orderBy: { visitDate: 'desc' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        company: true,
        industry: true,
        visitDate: true,
        invitedBy: { select: { name: true } }
      }
    })
    .catch(() => [])

  return (
    <VisitorsClient
      visitorDays={visitorDays.map((d) => ({
        ...d,
        date: d.date.toISOString()
      }))}
      visitors={visitors.map((v) => ({
        ...v,
        visitDate: v.visitDate.toISOString()
      }))}
    />
  )
}
