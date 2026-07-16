'use server'

import {} from 'next/cache'
import prisma from '@/prisma/client'
import { createLog } from '@/app/lib/utils/api/createLog'
import { auth } from '@/app/lib/auth'
import { chapterId } from '@/app/lib/constants/api/chapterId'
import { UserRole } from '@prisma/client'

export async function updateUser(
  userId: string,
  data: {
    name?: string
    email?: string
    phone?: string
    company?: string
    industry?: string
    membershipStatus?: string
    joinedAt?: Date
    expiresAt?: Date
    role: UserRole
    isMembership?: boolean
    isPublic?: boolean
    rejectionReason?: string
  }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return {
        success: false,
        error: 'Unauthorized'
      }
    }

    // Check if the current user is an admin
    if (session.user.role !== 'ADMIN') {
      return {
        success: false,
        error: 'Only admins can update user profiles'
      }
    }

    if (!userId) {
      return {
        success: false,
        error: 'User ID is required'
      }
    }

    // Check if user exists
    const existingUser = await prisma.user.findFirst({
      where: {
        id: userId,
        chapterId: chapterId
      }
    })

    if (!existingUser) {
      return {
        success: false,
        error: 'User not found or you do not have permission to update this profile'
      }
    }

    // Build update data object, only including provided fields
    const updateData: any = {
      updatedAt: new Date()
    }

    if (data.name !== undefined) updateData.name = data.name?.trim()
    if (data.email !== undefined) updateData.email = data.email?.trim()
    if (data.phone !== undefined) updateData.phone = data.phone
    if (data.role !== undefined) updateData.role = data.role
    if (data.company !== undefined) updateData.company = data.company?.trim()
    if (data.industry !== undefined) updateData.industry = data.industry?.trim()
    if (data.membershipStatus !== undefined) updateData.membershipStatus = data.membershipStatus
    if (data.joinedAt !== undefined) updateData.joinedAt = new Date(data.joinedAt)
    if (data.expiresAt !== undefined) updateData.expiresAt = new Date(data.expiresAt)
    if (data.isMembership !== undefined) updateData.isMembership = data.isMembership
    if (data.isPublic !== undefined) updateData.isPublic = data.isPublic
    if (data.rejectionReason !== undefined) updateData.rejectionReason = data.rejectionReason

    // Update the user
    await prisma.user.update({
      where: { id: userId },
      data: updateData
    })

    await createLog('info', 'User updated by admin', {
      location: ['server action - updateUser'],
      message: `User ${userId} updated by admin ${session.user.id}`,
      name: 'UserUpdatedByAdmin',
      timestamp: new Date().toISOString(),
      userId,
      adminId: session.user.id
    })

    return {
      success: true,
      message: 'Navigator updated'
    }
  } catch (error) {
    await createLog('error', 'Failed to update user', {
      location: ['server action - updateUser'],
      message: error instanceof Error ? error.message : 'Unknown error',
      name: 'UpdateUserError',
      timestamp: new Date().toISOString(),
      userId,
      error
    })

    return {
      success: false,
      error: 'Failed to update user'
    }
  }
}
