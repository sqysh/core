'use server'

import { Resend } from 'resend'
import { auth } from '../../auth'
import prisma from '@/prisma/client'
import { chapterId } from '../../constants/api/chapterId'
import { closedBusinessNotificationTemplate } from '../../email/closed-business.template'
import { createLog } from '../../utils/api/createLog'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function createAnchor(data: {
  businessValue: number
  description: string
  closedDate: Date
  giverId: string
}) {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: 'Unauthorized' }

  const receiverId = session.user.id
  const isExternal = data.giverId === 'external'

  if (!isExternal && data.giverId === receiverId) {
    return { success: false, error: 'You cannot thank yourself for closed business.' }
  }

  let giver: { id: string; name: string; email: string } | null = null

  if (!isExternal) {
    giver = await prisma.user.findFirst({
      where: { id: data.giverId, chapterId },
      select: { id: true, name: true, email: true }
    })
    if (!giver) return { success: false, error: 'Member not found in this chapter.' }
  }

  const anchor = await prisma.anchor.create({
    data: {
      businessValue: data.businessValue,
      description: data.description,
      closedDate: data.closedDate,
      chapterId,
      receiverId,
      giverId: isExternal ? null : data.giverId,
      externalGiverName: isExternal ? 'External' : null,
      status: 'REPORTED'
    }
  })

  // Only notify if giver is an internal member
  if (!isExternal && giver) {
    const baseUrl =
      process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://coastalreferralxchange.com'
    const emailHtml = closedBusinessNotificationTemplate(
      session.user.name,
      `${baseUrl}/dashboard?id=${anchor.id}&action=closed`
    )

    await resend.emails.send({
      from: `Coastal Referral Exchange <core@coastalreferralxchange.com>`,
      to: [giver.email],
      subject: `${session.user.name} thanked you for closed business`,
      html: emailHtml
    })
  }

  await createLog(
    'info',
    `Thank you for closed business — ${session.user.name} thanked ${isExternal ? 'an external member' : giver?.name}`,
    {
      location: ['server action - createAnchor'],
      name: 'TYFCBCreated',
      timestamp: new Date().toISOString(),
      anchorId: anchor.id
    }
  )

  return { success: true, anchor: { ...anchor, businessValue: Number(anchor.businessValue) } }
}
