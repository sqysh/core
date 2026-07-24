'use server'

import prisma from '@/prisma/client'
import { createLog } from '@/app/lib/utils/api/createLog'
import { auth } from '@/app/lib/auth'
import { chapterId } from '@/app/lib/constants/api/chapterId'
import { memberAcceptedTemplate } from '../../email/application-approved.template'
import { memberRejectedTemplate } from '../../email/application-rejected.template'
import { MembershipStatus, UserRole } from '@prisma/client'
import { resend } from '../../resend'

export async function updateUserStatus(userId: string, approve: boolean) {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: 'Unauthorized' }
  if (session.user.role !== 'SUPER_USER') return { success: false, error: 'Only superusers can update member status.' }
  if (!userId) return { success: false, error: 'User ID is required.' }

  const existingUser = await prisma.user.findFirst({
    where: { id: userId, chapterId },
    select: { id: true, name: true, email: true }
  })

  if (!existingUser) return { success: false, error: 'Member not found.' }

  const updateData = approve
    ? {
        membershipStatus: 'APPROVED' as MembershipStatus,
        role: 'MEMBER' as UserRole,
        finalDecisionAt: new Date().toISOString(),
        isFinalDecisionMade: true,
        updatedAt: new Date()
      }
    : {
        membershipStatus: 'REJECTED' as MembershipStatus,
        role: 'APPLICANT' as UserRole,
        isFinalDecisionMade: true,
        rejectedAt: new Date().toISOString(),
        rejectedStep: 'REJECTED',
        isRejected: true,
        updatedAt: new Date()
      }

  await prisma.user.update({ where: { id: userId }, data: updateData })

  if (approve) {
    await resend.emails.send({
      from: `Coastal Referral Exchange <membership@coastalreferralxchange.com>`,
      to: [existingUser.email],
      subject: "You've been accepted — welcome to Coastal Referral Exchange",
      html: memberAcceptedTemplate(existingUser.name.split(' ')[0], `${process.env.NEXT_PUBLIC_SITE_URL}/login`)
    })
  } else {
    await resend.emails.send({
      from: `Coastal Referral Exchange <membership@coastalreferralxchange.com>`,
      to: [existingUser.email],
      subject: 'Your application to Coastal Referral Exchange',
      html: memberRejectedTemplate(existingUser.name.split(' ')[0])
    })
  }

  await createLog('info', `Member ${approve ? 'approved' : 'rejected'} — ${existingUser.name}`, {
    location: ['server action - updateUserStatus'],
    name: 'UserStatusUpdated',
    timestamp: new Date().toISOString(),
    userId,
    adminId: session.user.id,
    membershipStatus: approve ? 'APPROVED' : 'REJECTED'
  })

  return { success: true }
}
