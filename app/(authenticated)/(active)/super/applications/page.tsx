import { auth } from '@/lib/auth/auth'
import { redirect } from 'next/navigation'
import prisma from '@/prisma/client'
import { chapterId } from '@/lib/constants/api/chapterId'
import SuperApplicationsClient from './SuperApplicationsClient'

export const dynamic = 'force-dynamic'

export default async function SuperApplicationsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  if (session.user.role !== 'SUPER_USER') redirect('/dashboard')

  const applicants = await prisma.user.findMany({
    where: {
      chapterId,
      membershipStatus: 'PENDING',
      role: 'APPLICANT'
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      company: true,
      title: true,
      industry: true,
      membershipStatus: true,
      createdAt: true,
      profileImage: true,
      hasCompletedApplication: true,
      isBackgroudCheckCompleted: true,
      isInitialReviewCompleted: true,
      isFinalDecisionMade: true,
      finalDecisionAt: true
    },
    orderBy: { createdAt: 'desc' }
  })

  return <SuperApplicationsClient applicants={applicants} />
}
