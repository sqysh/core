'use server'

import { auth } from '../../auth'
import prisma from '@/prisma/client'
import { chapterId } from '../../constants/api/chapterId'
import { createLog } from '../../utils/api/createLog'
import { oneTwoOneTemplate } from '../../email/1.2.1.template'
import { resend } from '../../resend'

type CreateFace2FaceInputs = {
  recipientId: string
  scheduledAt: Date
  notes?: string
}

export async function create121(data: CreateFace2FaceInputs) {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: 'Unauthorized' }

  const requesterId = session.user.id
  const { recipientId, scheduledAt, notes } = data

  if (requesterId === recipientId) {
    return { success: false, error: 'You cannot log a meeting with yourself.' }
  }

  const scheduledDate = new Date(scheduledAt)

  // Verify recipient exists in chapter
  const recipient = await prisma.user.findFirst({
    where: { id: recipientId, chapterId },
    select: { id: true, name: true, email: true }
  })

  if (!recipient) {
    await createLog('warning', `1-2-1 failed — recipient not found: ${recipientId}`, {
      location: ['server action - createFace2Face'],
      name: 'Face2FaceRecipientNotFound',
      timestamp: new Date().toISOString(),
      requesterId,
      recipientId
    })
    return { success: false, error: 'Member not found or not in this chapter.' }
  }

  // Check for exact duplicate
  const duplicate = await prisma.parley.findUnique({
    where: {
      requesterId_recipientId_scheduledAt: {
        requesterId,
        recipientId,
        scheduledAt: scheduledDate
      }
    }
  })

  if (duplicate) {
    await createLog('warning', `1-2-1 failed — duplicate meeting between ${requesterId} and ${recipientId}`, {
      location: ['server action - createFace2Face'],
      name: 'Face2FaceDuplicate',
      timestamp: new Date().toISOString(),
      requesterId,
      recipientId,
      scheduledAt,
      existingParleyId: duplicate.id
    })
    return { success: false, error: 'A meeting between you and this member at this time already exists.' }
  }

  // Create completed meeting
  const face2face = await prisma.parley.create({
    data: {
      requesterId,
      recipientId,
      scheduledAt: scheduledDate,
      notes,
      chapterId,
      status: 'COMPLETED',
      completed: true,
      completedAt: new Date()
    },
    include: {
      requester: { select: { id: true, name: true, email: true } },
      recipient: { select: { id: true, name: true, email: true } }
    }
  })

  // Notify recipient
  const baseUrl =
    process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://coastalreferralxchange.com'
  const emailHtml = oneTwoOneTemplate(face2face.requester.name, face2face.recipient.name, `${baseUrl}/dashboard`)

  await resend.emails.send({
    from: `Coastal Referral Exchange <core@coastalreferralxchange.com>`,
    to: [face2face.recipient.email],
    subject: `${face2face.requester.name} logged a 1-2-1 meeting with you`,
    html: emailHtml
  })

  await createLog('info', `1-2-1 logged — ${face2face.requester.name} met with ${face2face.recipient.name}`, {
    location: ['server action - createFace2Face'],
    name: 'Face2FaceCreated',
    timestamp: new Date().toISOString(),
    requesterId,
    recipientId,
    parleyId: face2face.id
  })

  return { success: true }
}
