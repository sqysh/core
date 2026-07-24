'use server'

import prisma from '@/prisma/client'
import { createLog } from '@/app/lib/utils/api/createLog'
import { auth } from '@/app/lib/auth'
import { chapterId } from '@/app/lib/constants/api/chapterId'
import { Resend } from 'resend'
import referralNotificationTemplate from '../../email/referral-notificiation.template'

const resend = new Resend(process.env.RESEND_API_KEY)

const BASE_URL = process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://coastalreferralxchange.com'

export async function createReferral(data: {
  clientName: string
  clientPhone?: string
  serviceNeeded: string
  receiverId: string
  giverId: string
}) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return {
        success: false,
        error: 'Unauthorized'
      }
    }

    const { clientName, clientPhone, serviceNeeded, receiverId, giverId } = data

    // Prevent self-referral
    if (giverId === receiverId) {
      return {
        success: false,
        error: 'Cannot give referral to yourself'
      }
    }

    // Validate required fields
    if (!clientName || !serviceNeeded || !receiverId) {
      return {
        success: false,
        error: 'Missing required fields: clientName, serviceNeeded, and receiverId are required'
      }
    }

    // Check if receiver exists and is in the same chapter
    const receiver = await prisma.user.findFirst({
      where: {
        id: receiverId,
        chapterId: chapterId
      }
    })

    if (!receiver) {
      return {
        success: false,
        error: 'Receiver not found or not in the same chapter'
      }
    }

    // Create the Referral
    const referral = await prisma.treasureMap.create({
      data: {
        clientName,
        clientPhone,
        serviceNeeded,
        chapterId,
        giverId,
        receiverId
      }
    })

    await createLog('info', 'New referral created', {
      location: ['server action - createReferral'],
      message: `New referral referral created for client: ${clientName}`,
      name: 'ReferralCreated',
      timestamp: new Date().toISOString(),
      metadata: {
        referralId: referral.id,
        clientName: referral.clientName,
        serviceNeeded: referral.serviceNeeded,
        giverId: referral.giverId,
        receiverId: referral.receiverId
      }
    })

    const giverName = session.user.name

    resend.emails.send({
      from: `Coastal Referral Exchange <core@coastalreferralxchange.com>`,
      to: [receiver.email],
      subject: `${giverName} sent you a referral`,
      html: referralNotificationTemplate(giverName, `${BASE_URL}/dashboard?id=${referral.id}&action=referral`)
    })

    return {
      success: true,
      message: 'Referral created successfully'
    }
  } catch (error) {
    await createLog('error', 'Failed to create referral', {
      location: ['server action - createReferral'],
      message: error instanceof Error ? error.message : 'Unknown error',
      name: 'CreateReferralError',
      timestamp: new Date().toISOString(),
      error
    })

    return {
      success: false,
      error: 'Failed to create referral'
    }
  }
}
