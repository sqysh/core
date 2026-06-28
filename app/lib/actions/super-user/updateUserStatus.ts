'use server'

import prisma from '@/prisma/client'
import { createLog } from '@/app/lib/utils/api/createLog'
import { auth } from '@/app/lib/auth'
import { chapterId } from '@/app/lib/constants/api/chapterId'
import { Resend } from 'resend'
import { memberAcceptedTemplate } from '../../email-templates/application-approved.template'
import { memberRejectedTemplate } from '../../email-templates/application-rejected.template'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function updateUserStatus(userId: string, membershipStatus: 'ACTIVE' | 'REJECTED') {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: 'Unauthorized' }
  if (!session.user.isSuperUser) return { success: false, error: 'Only superusers can update member status.' }
  if (!userId) return { success: false, error: 'User ID is required.' }

  const existingUser = await prisma.user.findFirst({
    where: { id: userId, chapterId },
    select: { id: true, name: true, email: true }
  })

  if (!existingUser) return { success: false, error: 'Member not found.' }

  const updateData =
    membershipStatus === 'ACTIVE'
      ? {
          membershipStatus,
          role: 'MEMBER',
          finalDecisionAt: new Date().toISOString(),
          isFinalDecisionMade: true,
          updatedAt: new Date()
        }
      : {
          membershipStatus,
          role: 'REJECTED',
          rejectedAt: new Date().toISOString(),
          rejectedStep: 'REJECTED',
          isRejected: true,
          updatedAt: new Date()
        }

  await prisma.user.update({ where: { id: userId }, data: updateData })

  const baseUrl =
    process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://coastalreferralxchange.com'

  if (membershipStatus === 'ACTIVE') {
    await resend.emails.send({
      from: `Coastal Referral Exchange <noreply@coastalreferralxchange.com>`,
      to: [existingUser.email],
      subject: "You've been accepted — welcome to Coastal Referral Exchange",
      html: memberAcceptedTemplate(existingUser.name.split(' ')[0], `${baseUrl}/login`)
    })
  } else {
    await resend.emails.send({
      from: `Coastal Referral Exchange <noreply@coastalreferralxchange.com>`,
      to: [existingUser.email],
      subject: 'Your application to Coastal Referral Exchange',
      html: memberRejectedTemplate(existingUser.name.split(' ')[0])
    })
  }

  await createLog('info', `Member ${membershipStatus === 'ACTIVE' ? 'accepted' : 'rejected'} — ${existingUser.name}`, {
    location: ['server action - updateUserStatus'],
    name: 'UserStatusUpdated',
    timestamp: new Date().toISOString(),
    userId,
    adminId: session.user.id,
    membershipStatus
  })

  return { success: true }
}
