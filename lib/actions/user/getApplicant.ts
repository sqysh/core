import prisma from '@/prisma/client'
import { createLog } from '@/lib/utils/api/createLog'
import { chapterId } from '@/lib/constants/api/chapterId'

export async function getApplicant(userId: string) {
  try {
    if (!userId) {
      return {
        success: false,
        error: 'User ID is required'
      }
    }

    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        chapterId: chapterId
      },
      select: {
        name: true,
        email: true,
        phone: true,
        location: true,
        company: true,
        industry: true,
        businessLicenseNumber: true,
        isLicensed: true
      }
    })

    if (!user) {
      return {
        success: false,
        error: 'Applicant not found'
      }
    }

    return { success: true, data: user }
  } catch (error) {
    await createLog('error', 'Failed to fetch applicant', {
      location: ['server action - getApplicant'],
      message: error instanceof Error ? error.message : 'Unknown error',
      name: 'GetApplicantError',
      timestamp: new Date().toISOString(),
      userId,
      error
    })

    return {
      success: false,
      error: 'Failed to fetch applicant'
    }
  }
}
