'use server'

import prisma from '@/prisma/client'
import { auth } from '../../auth'
import { MembershipStatus } from '@/types/user.types'
import { createLog } from '../../utils/api/createLog'
import { UserRole } from '@prisma/client'

export async function updateMember(
  userId: string,
  data: {
    email?: string
    name?: string
    phone?: string | null
    company?: string
    title?: string
    isPublic?: boolean
    role?: UserRole
    isMembership?: boolean
    membershipStatus?: MembershipStatus
    profileImage?: string | null
    profileImageFilename?: string | null
    yearsInBusiness?: string | null
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' }
    if (session.user.role !== 'SUPER_USER') {
      return { success: false, error: 'Only superusers can update members.' }
    }

    // Display email is unique — reject collisions before Prisma throws P2002
    let email = data.email
    if (email !== undefined) {
      email = email.trim().toLowerCase()
      if (!email) return { success: false, error: 'Display email cannot be empty.' }

      const taken = await prisma.user.findFirst({
        where: { email, NOT: { id: userId } },
        select: { name: true }
      })
      if (taken) return { success: false, error: `That email belongs to ${taken.name}.` }
    }

    const updateData: any = {
      email,
      name: data.name,
      phone: data.phone,
      company: data.company,
      title: data.title,
      isPublic: data.isPublic,
      role: data.role,
      isMembership: data.isMembership,
      membershipStatus: data.membershipStatus,
      yearsInBusiness: data.yearsInBusiness
    }

    // only skip undefined (but allow null)
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined) {
        delete updateData[key]
      }
    })

    // explicitly include nullable fields
    if (data.profileImage !== undefined) {
      updateData.profileImage = data.profileImage
    }

    if (data.profileImageFilename !== undefined) {
      updateData.profileImageFilename = data.profileImageFilename
    }

    await prisma.user.update({
      where: { id: userId },
      data: updateData
    })

    await createLog('info', 'Member updated by superuser', {
      location: ['server action - updateMember'],
      message: `Superuser updated member ${userId}`,
      name: 'SuperMemberUpdated',
      timestamp: new Date().toISOString(),
      userId,
      adminId: session.user.id,
      fields: Object.keys(updateData)
    })

    return { success: true }
  } catch (error) {
    await createLog('error', 'Failed to update member', {
      location: ['server action - updateMember'],
      message: error instanceof Error ? error.message : 'Unknown error',
      name: 'SuperMemberUpdateError',
      timestamp: new Date().toISOString(),
      error
    })
    return { success: false, error: 'Failed to update member' }
  }
}
