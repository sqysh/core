import { auth } from '@/lib/auth/auth'
import { redirect } from 'next/navigation'
import prisma from '@/prisma/client'
import { chapterId } from '@/lib/constants/api/chapterId'
import SuperMembersClient from './SuperMembersClient'

export const dynamic = 'force-dynamic'

const MEMBER_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  lastLoginAt: true,
  membershipStatus: true,
  role: true,
  hasAnnualSubscription: true,
  hasQuarterlySubscription: true,
  profileImage: true,
  company: true,
  title: true,
  _count: { select: { alternateEmails: true } }
} as const

export default async function SuperMembersPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  if (session.user.role !== 'SUPER_USER') redirect('/dashboard')

  const [activeMembers, approvedMembers, inactiveMembers] = await Promise.all([
    prisma.user.findMany({
      where: { chapterId, membershipStatus: 'ACTIVE' },
      select: MEMBER_SELECT,
      orderBy: { name: 'asc' }
    }),
    prisma.user.findMany({
      where: { chapterId, membershipStatus: 'APPROVED' },
      select: MEMBER_SELECT,
      orderBy: { name: 'asc' }
    }),
    prisma.user.findMany({
      where: {
        chapterId,
        membershipStatus: { in: ['INACTIVE', 'CANCELLED', 'EXPIRED', 'SUSPENDED'] }
      },
      select: MEMBER_SELECT,
      orderBy: { name: 'asc' }
    })
  ])

  return (
    <SuperMembersClient
      activeMembers={activeMembers}
      approvedMembers={approvedMembers}
      inactiveMembers={inactiveMembers}
    />
  )
}
