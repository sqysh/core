import prisma from '@/prisma/client'

export async function getUsers() {
  try {
    const users = await prisma.user.findMany({
      where: { membershipStatus: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        title: true,
        company: true,
        industry: true,
        profileImage: true,
        profileVideo: true,
        bio: true,
        website: true,
        yearsInBusiness: true,
        isPublic: true,
        email: true,
        createdAt: true,
        updatedAt: true,
        chapterId: true,
        membershipStatus: true,
        hasCompletedApplication: true,
        role: true
      },
      orderBy: [{ membershipStatus: 'asc' }, { createdAt: 'asc' }]
    })

    const statusOrder: Record<string, number> = {
      ACTIVE: 0,
      INACTIVE: 1,
      PENDING: 2,
      FLAGGED: 3
    }

    const sortedUsers = users.sort((a, b) => {
      const aOrder = statusOrder[a.membershipStatus] ?? 99
      const bOrder = statusOrder[b.membershipStatus] ?? 99
      return aOrder - bOrder
    })

    return { success: true, data: sortedUsers }
  } catch {
    return { success: false, error: 'Failed to fetch users' }
  }
}
