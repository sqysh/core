import prisma from '@/prisma/client'
import { auth } from '../../auth/auth'
import { chapterId } from '../../constants/api/chapterId'
import { formatCurrency } from '../../utils/currency.utils'

export type AdminDashboardData = {
  stats: {
    totalRevenue: string
    totalParleys: number
    totalAnchors: number
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

    const [parleys, anchors, referrals, activeMembers, pendingApps, recentParleys, recentAnchors, recentReferrals] =
      await Promise.all([
        prisma.parley.count({
          where: { chapterId, status: { not: 'CANCELLED' } }
        }),
        prisma.anchor.findMany({
          where: { chapterId },
          select: {
            businessValue: true,
            createdAt: true,
            id: true,
            giver: { select: { name: true } },
            receiver: { select: { name: true } }
          }
        }),
        prisma.treasureMap.count({ where: { chapterId } }),
        prisma.user.count({ where: { chapterId, membershipStatus: 'ACTIVE' } }),
        prisma.user.count({
          where: {
            chapterId,
            membershipStatus: { in: ['PENDING'] }
          }
        }),
        prisma.parley.findMany({
          where: { chapterId, status: { not: 'CANCELLED' } },
          orderBy: { createdAt: 'desc' },

          select: {
            id: true,
            createdAt: true,
            requester: { select: { name: true } },
            recipient: { select: { name: true } }
          }
        }),
        prisma.anchor.findMany({
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
        prisma.treasureMap.findMany({
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

    const totalRevenue = anchors.reduce((sum, a) => sum + Number(a.businessValue), 0)

    const recentActivity = [
      ...recentParleys.map((p) => ({
        id: p.id,
        type: 'MEETING' as const,
        label: `Face-2-Face · ${p.requester.name} met with ${p.recipient.name}`,
        createdAt: p.createdAt.toISOString()
      })),

      ...recentAnchors.map((a) => ({
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
          totalParleys: parleys,
          totalAnchors: anchors.length,
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
