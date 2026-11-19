import prisma from '@/prisma/client'
import { auth } from '@/lib/auth/auth'
import { chapterId } from '@/lib/constants/api/chapterId'
import { formatCurrency } from '@/lib/utils/currency.utils'

export type AdminDashboardData = {
  stats: {
    totalRevenue: string
    totalOneTwoOnes: number
    totalClosedBusinesses: number
    totalReferrals: number
    activeMembers: number
    pendingApps: number
  }
  recentActivity: {
    id: string
    type: 'MEETING' | 'REFERRAL' | 'CLOSED'
    label: string
    createdAt: string
  }[]
}

export async function getAdminDashboardData(): Promise<{
  success: boolean
  data?: AdminDashboardData
  error?: string
}> {
  try {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' }

    const [oneTwoOnes, closedBusinesses, referrals, activeMembers, pendingApps, recentOneTwoOnes, recentClosedBusinesses, recentReferrals] =
      await Promise.all([
        prisma.oneTwoOne.count({
          where: { chapterId, status: { not: 'CANCELLED' } }
        }),
        prisma.closedBusiness.findMany({
          where: { chapterId },
          select: {
            businessValue: true,
            createdAt: true,
            id: true,
            giver: { select: { name: true } },
            receiver: { select: { name: true } }
          }
        }),
        prisma.referral.count({ where: { chapterId } }),
        prisma.user.count({ where: { chapterId, membershipStatus: 'ACTIVE' } }),
        prisma.user.count({
          where: {
            chapterId,
            membershipStatus: { in: ['PENDING'] }
          }
        }),
        prisma.oneTwoOne.findMany({
          where: { chapterId, status: { not: 'CANCELLED' } },
          orderBy: { createdAt: 'desc' },

          select: {
            id: true,
            createdAt: true,
            requester: { select: { name: true } },
            recipient: { select: { name: true } }
          }
        }),
        prisma.closedBusiness.findMany({
          where: { chapterId },
          orderBy: { createdAt: 'desc' },

          select: {
            id: true,
            createdAt: true,
            businessValue: true,
            giver: { select: { name: true } },
            receiver: { select: { name: true } }
          }
        }),
        prisma.referral.findMany({
          where: { chapterId },
          orderBy: { createdAt: 'desc' },

          select: {
            id: true,
            createdAt: true,
            clientName: true,
            giver: { select: { name: true } },
            receiver: { select: { name: true } }
          }
        })
      ])

    const totalRevenue = closedBusinesses.reduce((sum, a) => sum + Number(a.businessValue), 0)

    const recentActivity = [
      ...recentOneTwoOnes.map((p) => ({
        id: p.id,
        type: 'MEETING' as const,
        label: `Face-2-Face · ${p.requester.name} met with ${p.recipient.name}`,
        createdAt: p.createdAt.toISOString()
      })),

      ...recentClosedBusinesses.map((a) => ({
        id: a.id,
        type: 'CLOSED' as const,
        label: `Closed business · $${Number(a.businessValue).toLocaleString()} · from ${a.giver?.name ?? 'External'}`,
        createdAt: a.createdAt.toISOString()
      })),

      ...recentReferrals.map((r) => ({
        id: r.id,
        type: 'REFERRAL' as const,
        label: `${r.giver.name} referred ${r.clientName} to ${r.receiver.name}`,
        createdAt: r.createdAt.toISOString()
      }))
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return {
      success: true,
      data: {
        stats: {
          totalRevenue: formatCurrency(totalRevenue),
          totalOneTwoOnes: oneTwoOnes,
          totalClosedBusinesses: closedBusinesses.length,
          totalReferrals: referrals,
          activeMembers,
          pendingApps
        },
        recentActivity
      }
    }
  } catch (error) {
    return { success: false, error: 'Failed to load admin dashboard' }
  }
}
