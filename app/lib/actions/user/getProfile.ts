import { ProfileData } from '@/types/user.types'
import { auth } from '../../auth'
import prisma from '@/prisma/client'

export async function getProfile(): Promise<{ success: boolean; data?: ProfileData; error?: string }> {
  try {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        company: true,
        isPublic: true,
        profileImage: true,
        profileImageFilename: true,
        profileVideo: true,
        profileVideoFilename: true,
        location: true,
        bio: true,
        businessLicenseNumber: true,
        industry: true,
        title: true,
        website: true,
        yearsInBusiness: true,
        facebookUrl: true,
        goal: true,
        linkedInUrl: true,
        threadsUrl: true,
        xUrl: true,
        youtubeUrl: true,
        weeklyTreasureWishlist: true,
        alternateEmails: {
          orderBy: { createdAt: 'asc' },
          select: { id: true, email: true, createdAt: true }
        }
      }
    })

    if (!user) return { success: false, error: 'User not found' }

    return {
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone ?? '',
        company: user.company,
        isPublic: user.isPublic,
        profileImage: user.profileImage,
        profileImageFilename: user.profileImageFilename,
        profileVideo: user.profileVideo,
        profileVideoFilename: user.profileVideoFilename,
        location: user.location ?? '',
        bio: user.bio ?? '',
        businessLicenseNumber: user.businessLicenseNumber ?? '',
        industry: user.industry ?? '',
        title: user.title ?? '',
        website: user.website ?? '',
        yearsInBusiness: user.yearsInBusiness ?? '',
        facebookUrl: user.facebookUrl ?? '',
        goal: user.goal ?? '',
        linkedInUrl: user.linkedInUrl ?? '',
        threadsUrl: user.threadsUrl ?? '',
        xUrl: user.xUrl ?? '',
        youtubeUrl: user.youtubeUrl ?? '',
        weeklyTreasureWishlist: user.weeklyTreasureWishlist ?? '',
        alternateEmails: user.alternateEmails.map((e) => ({
          id: e.id,
          email: e.email,
          createdAt: e.createdAt.toISOString()
        }))
      }
    }
  } catch (error) {
    return { success: false, error: 'Failed to load profile' }
  }
}
