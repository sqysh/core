import prisma from '@/prisma/client'
import { auth } from '../../auth'
import { UserRole } from '@prisma/client'
import { UserEmailItem } from '@/types/user.types'

export type MemberParleyActivity = {
  id: string
  scheduledAt: string
  status: string
  requesterId: string
  requester: { name: string }
  recipient: { name: string }
}

export type MemberAnchorActivity = {
  id: string
  businessValue: number
  description: string
  status: string
  closedDate: string
  giverId: string | null
  giver: { name: string } | null
  receiver: { name: string } | null
}

export type MemberReferralActivity = {
  id: string
  clientName: string
  serviceNeeded: string
  status: string
  createdAt: string
  giverId: string
  giver: { name: string }
  receiver: { name: string }
}

export type SuperMemberEditData = {
  id: string
  name: string
  email: string
  phone: string | null
  company: string
  title: string
  isPublic: boolean
  role: UserRole
  isMembership: boolean
  membershipStatus: string
  profileImage: string | null
  profileImageFilename: string | null
  yearsInBusiness?: string
  hasAnnualSubscription: boolean
  hasQuarterlySubscription: boolean
  createdAt: string
  lastLoginAt: string | null
  alternateEmails: UserEmailItem[]
  paymentMethods: {
    id: string
    brand: string
    last4: string
    expMonth: number
    expYear: number
    isDefault: boolean
    createdAt: string
  }[]
  activity: {
    face2face: MemberParleyActivity[]
    tyfcb: MemberAnchorActivity[]
    referrals: MemberReferralActivity[]
  }
}

export async function getUserById(userId: string): Promise<{
  success: boolean
  data?: SuperMemberEditData
  error?: string
}> {
  try {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' }

    const [user, face2face, tyfcb, referrals, paymentMethods] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          company: true,
          title: true,
          isPublic: true,
          role: true,
          isMembership: true,
          membershipStatus: true,
          profileImage: true,
          profileImageFilename: true,
          yearsInBusiness: true,
          hasAnnualSubscription: true,
          hasQuarterlySubscription: true,
          createdAt: true,
          lastLoginAt: true,
          alternateEmails: true
        }
      }),
      prisma.parley.findMany({
        where: { OR: [{ requesterId: userId }, { recipientId: userId }] },
        orderBy: { scheduledAt: 'desc' },
        select: {
          id: true,
          scheduledAt: true,
          status: true,
          requester: { select: { name: true } },
          recipient: { select: { name: true } },
          requesterId: true
        }
      }),
      prisma.anchor.findMany({
        where: { OR: [{ giverId: userId }, { receiverId: userId }] },
        orderBy: { closedDate: 'desc' },
        select: {
          id: true,
          businessValue: true,
          description: true,
          status: true,
          closedDate: true,
          giver: { select: { name: true } },
          receiver: { select: { name: true } },
          giverId: true
        }
      }),
      prisma.treasureMap.findMany({
        where: { OR: [{ giverId: userId }, { receiverId: userId }] },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          clientName: true,
          serviceNeeded: true,
          status: true,
          createdAt: true,
          giver: { select: { name: true } },
          receiver: { select: { name: true } },
          giverId: true
        }
      }),
      prisma.paymentMethod.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          brand: true,
          last4: true,
          expMonth: true,
          expYear: true,
          isDefault: true,
          createdAt: true
        }
      })
    ])

    return {
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        company: user.company,
        title: user.title,
        isPublic: user.isPublic,
        role: user.role,
        isMembership: user.isMembership,
        membershipStatus: user.membershipStatus,
        profileImage: user.profileImage,
        profileImageFilename: user.profileImageFilename,
        yearsInBusiness: user.yearsInBusiness,
        hasAnnualSubscription: user.hasAnnualSubscription,
        hasQuarterlySubscription: user.hasQuarterlySubscription,
        createdAt: user.createdAt.toISOString(),
        lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
        alternateEmails: user.alternateEmails.map((e) => ({
          id: e.id,
          email: e.email,
          createdAt: e.createdAt.toISOString()
        })),
        paymentMethods: paymentMethods.map((pm) => ({
          ...pm,
          createdAt: pm.createdAt.toISOString()
        })),
        activity: {
          face2face: face2face.map((p) => ({
            ...p,
            scheduledAt: p.scheduledAt.toISOString()
          })),
          tyfcb: tyfcb.map((a) => ({
            ...a,
            businessValue: Number(a.businessValue),
            closedDate: a.closedDate.toISOString()
          })),
          referrals: referrals.map((r) => ({
            ...r,
            createdAt: r.createdAt.toISOString()
          }))
        }
      }
    }
  } catch (error) {
    return { success: false, error: 'Failed to load member' }
  }
}
