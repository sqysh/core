'use server'

import { UpdateProfileInput } from '@/types/user.types'
import { auth } from '../../auth'
import prisma from '@/prisma/client'
import { createLog } from '../../utils/api/createLog'

export async function updateProfile(data: UpdateProfileInput): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' }

    const updateData: any = {
      name: data.name ?? undefined,
      phone: data.phone ?? undefined,
      company: data.company ?? undefined,
      isPublic: data.isPublic ?? undefined,
      location: data.location ?? undefined,
      bio: data.bio ?? undefined,
      businessLicenseNumber: data.businessLicenseNumber ?? undefined,
      industry: data.industry ?? undefined,
      title: data.title ?? undefined,
      website: data.website ?? undefined,
      yearsInBusiness: data.yearsInBusiness ?? undefined,
      facebookUrl: data.facebookUrl ?? undefined,
      goal: data.goal ?? undefined,
      linkedInUrl: data.linkedInUrl ?? undefined,
      threadsUrl: data.threadsUrl ?? undefined,
      xUrl: data.xUrl ?? undefined,
      youtubeUrl: data.youtubeUrl ?? undefined,
      weeklyTreasureWishlist: data.weeklyTreasureWishlist ?? undefined
    }

    // explicitly include nullable fields
    if (data.profileImage !== undefined) {
      updateData.profileImage = data.profileImage
    }

    if (data.profileImageFilename !== undefined) {
      updateData.profileImageFilename = data.profileImageFilename
    }
    // explicitly include nullable fields
    if (data.profileVideo !== undefined) {
      updateData.profileVideo = data.profileVideo
    }

    if (data.profileVideoFilename !== undefined) {
      updateData.profileVideoFilename = data.profileVideoFilename
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: updateData
    })

    await createLog('info', 'Profile updated', {
      location: ['server action - updateProfile'],
      message: `User ${session.user.id} updated their profile`,
      name: 'ProfileUpdated',
      timestamp: new Date().toISOString()
    })

    return { success: true }
  } catch (error) {
    await createLog('error', 'Failed to update profile', {
      location: ['server action - updateProfile'],
      message: error instanceof Error ? error.message : 'Unknown error',
      name: 'ProfileUpdateError',
      timestamp: new Date().toISOString(),
      error
    })
    return { success: false, error: 'Failed to update profile' }
  }
}
