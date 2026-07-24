'use server'

import { CreateUserInput, CreateUserResponse } from '@/types/user.types'
import { validateUserData } from '../../utils/validations/validateUserData'
import prisma from '@/prisma/client'
import { createLog } from '../../utils/api/createLog'
import { chapterId } from '../../constants/api/chapterId'
import { applicationConfirmationTemplate } from '../../email/application-confirmation.template'
import { adminVisitorNotificationTemplate } from '../../email/admin-visitor-notification'
import { calculateExpiresAt } from '../../utils/date.utils'
import { resend } from '../../resend'

const BASE_URL = process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://coastalreferralxchange.com'

export async function createUser(input: CreateUserInput): Promise<CreateUserResponse> {
  try {
    const validationErrors = validateUserData(input)
    if (validationErrors.length > 0) {
      return {
        error: 'Validation failed',
        fieldErrors: validationErrors,
        user: null
      }
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() }
    })

    if (existingUser) {
      return {
        error: 'Email already exists',
        user: null
      }
    }

    const user = await prisma.user.create({
      data: {
        name: input?.name?.trim(),
        email: input?.email.toLowerCase()?.trim(),
        phone: input?.phone || null,
        company: input.company?.trim(),
        industry: input.industry?.trim(),
        location: input?.location?.trim(),
        businessLicenseNumber: input?.businessLicenseNumber?.trim(),
        role: 'APPLICANT',
        membershipStatus: 'PENDING',
        isLicensed: true,
        isMembership: false,
        isPublic: false,
        hasCompletedApplication: true,
        joinedAt: new Date(),
        expiresAt: calculateExpiresAt(),
        chapter: {
          connect: {
            id: chapterId
          }
        }
      },
      include: {
        chapter: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    await Promise.all([
      resend.emails.send({
        from: `Coastal Referral Exchange <core@coastalreferralxchange.com>`,
        to: 'greg@sqysh.com',
        subject: `New Application — ${user.name}`,
        html: adminVisitorNotificationTemplate('Sqysh', user.name, user.email, `${BASE_URL}/super`)
      }),
      resend.emails.send({
        from: `Coastal Referral Exchange <core@coastalreferralxchange.com>`,
        to: user.email,
        subject: `We received your application — Coastal Referral Exchange`,
        html: applicationConfirmationTemplate(user.name.split(' ')[0], user.id, `${BASE_URL}/application/${user.id}`)
      })
    ])

    await createLog('info', `New user created — ${user.name} (${user.email})`, {
      location: ['server action - createUser'],
      name: 'NewUserCreated',
      timestamp: new Date().toISOString(),
      userId: user.id
    })

    return { success: true, user: { id: user.id } }
  } catch (error) {
    await createLog('error', 'Failed to create user', {
      location: ['server action - createUser'],
      name: 'CreateUserError',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    return { success: false, error: 'Failed to create user', user: null }
  }
}
