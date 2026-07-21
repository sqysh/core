'use server'

import prisma from '@/prisma/client'
import { auth } from '../../auth'
import { chapterId } from '../../constants/api/chapterId'
import { createLog } from '../../utils/api/createLog'
import { formatCurrency } from '../../utils/currency.utils'
import { SuperUserDashboardData, SuperUserStats } from '@/types/super.types'

export async function getSuperUserDashboardData(): Promise<
  { success: true; data: SuperUserDashboardData } | { success: false; error: string }
> {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Unauthorized' }

    const [
      members,
      applicants,
      parleys,
      referrals,
      anchors,
      visitors,
      chapter,
      meetingsTotal,
      referralsOpen,
      anchorsAllTime,
      events
    ] = await Promise.all([
      prisma.user
        .findMany({
          where: { chapterId },
          select: {
            id: true,
            name: true,
            company: true,
            title: true,
            industry: true,
            role: true,
            membershipStatus: true,
            isMembership: true,
            lastLoginAt: true,
            profileImage: true,
            joinedAt: true,
            hasAnnualSubscription: true,
            hasQuarterlySubscription: true,
            _count: {
              select: {
                requestedMeetings: true,
                giver: true,
                givenCredits: true
              }
            }
          },
          orderBy: { lastLoginAt: 'desc' }
        })
        .catch(() => null),

      prisma.user
        .findMany({
          where: {
            chapterId,
            OR: [
              { membershipStatus: { in: ['PENDING', 'REJECTED'] } },
              { membershipStatus: 'ACTIVE', hasCompletedApplication: true }
            ]
          },
          select: {
            id: true,
            name: true,
            company: true,
            industry: true,
            email: true,
            phone: true,
            membershipStatus: true,
            hasCompletedApplication: true,
            businessLicenseNumber: true,
            createdAt: true,
            finalDecisionAt: true
          },
          orderBy: { createdAt: 'desc' }
        })
        .catch(() => null),

      prisma.parley
        .findMany({
          where: { chapterId },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            scheduledAt: true,
            status: true,
            notes: true,
            createdAt: true,
            requester: { select: { id: true, name: true, company: true } },
            recipient: { select: { id: true, name: true, company: true } }
          }
        })
        .catch(() => null),

      prisma.treasureMap
        .findMany({
          where: { chapterId },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            clientName: true,
            serviceNeeded: true,
            status: true,
            createdAt: true,
            giver: { select: { id: true, name: true, company: true } },
            receiver: { select: { id: true, name: true, company: true } }
          }
        })
        .catch(() => null),

      prisma.anchor
        .findMany({
          where: { chapterId },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            businessValue: true,
            description: true,
            status: true,
            closedDate: true,
            createdAt: true,
            giver: { select: { id: true, name: true, company: true } },
            receiver: { select: { id: true, name: true, company: true } }
          }
        })
        .catch(() => null),

      prisma.visitor
        .findMany({
          where: { chapterId },
          orderBy: { visitDate: 'asc' },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            company: true,
            industry: true,
            visitDate: true,
            createdAt: true,
            invitedBy: { select: { name: true } }
          }
        })
        .catch(() => null),

      prisma.chapter
        .findUnique({
          where: { id: chapterId },
          select: {
            name: true,
            location: true,
            meetingDay: true,
            meetingTime: true,
            meetingFrequency: true,
            hasUnlockedBooty: true,
            hasUnlockedGrog: true,
            hasUnlockedMuster: true
          }
        })
        .catch(() => null),

      prisma.parley
        .count({
          where: { chapterId, status: { not: 'CANCELLED' } }
        })
        .catch(() => 0),

      prisma.treasureMap
        .count({
          where: { chapterId, status: 'GIVEN' }
        })
        .catch(() => 0),

      prisma.anchor
        .findMany({
          where: { chapterId },
          select: { businessValue: true }
        })
        .catch(() => []),

      prisma.event
        .findMany({
          where: { chapterId },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            org: true,
            description: true,
            externalLink: true,
            status: true,
            createdAt: true
          }
        })
        .catch(() => [])
    ])

    const closedTotal = (anchorsAllTime ?? []).reduce((s, a) => s + Number(a.businessValue), 0)
    const activeMembers = (members ?? []).filter((m) => m.membershipStatus === 'ACTIVE').length

    const stats: SuperUserStats = {
      totalMembers: members?.length ?? 0,
      activeMembers,
      meetingsTotal: meetingsTotal ?? 0,
      referralsOpen: referralsOpen ?? 0,
      closedTotal: formatCurrency(closedTotal)
    }

    return {
      success: true,
      data: {
        stats,
        members: (members ?? []).map((m) => ({
          id: m.id,
          name: m.name,
          company: m.company,
          title: m.title,
          industry: m.industry,
          role: m.role,
          membershipStatus: m.membershipStatus,
          isMembership: m.isMembership,
          lastLoginAt: m.lastLoginAt?.toISOString() ?? null,
          joinedAt: m.joinedAt?.toISOString() ?? null,
          loginCount: 0,
          parleyCount: m._count.requestedMeetings,
          referralCount: m._count.giver,
          closedCount: m._count.givenCredits,
          profileImage: m.profileImage,
          hasAnnualSubscription: m.hasAnnualSubscription,
          hasQuarterlySubscription: m.hasQuarterlySubscription
        })),
        applicants: (applicants ?? []).map((a) => ({
          ...a,
          createdAt: a.createdAt.toISOString(),
          finalDecisionAt: a.finalDecisionAt
        })),
        parleys: (parleys ?? []).map((p) => ({
          id: p.id,
          scheduledAt: p.scheduledAt.toISOString(),
          status: p.status,
          notes: p.notes,
          createdAt: p.createdAt.toISOString(),
          requester: p.requester,
          recipient: p.recipient
        })),
        referrals: (referrals ?? []).map((r) => ({
          id: r.id,
          clientName: r.clientName,
          serviceNeeded: r.serviceNeeded,
          status: r.status,
          createdAt: r.createdAt.toISOString(),
          giver: r.giver,
          receiver: r.receiver
        })),
        anchors: (anchors ?? []).map((a) => ({
          id: a.id,
          businessValue: Number(a.businessValue).toFixed(2),
          description: a.description,
          status: a.status,
          closedDate: a.closedDate.toISOString(),
          createdAt: a.createdAt.toISOString(),
          giver: a.giver,
          receiver: a.receiver
        })),
        visitors: (visitors ?? []).map((v) => ({
          id: v.id,
          firstName: v.firstName,
          lastName: v.lastName,
          email: v.email,
          company: v.company,
          industry: v.industry,
          visitDate: v.visitDate,
          createdAt: v.createdAt,
          invitedBy: v.invitedBy ? { name: v.invitedBy.name } : null
        })),
        chapter: { ...chapter, id: chapterId },
        events: (events ?? []).map((e) => ({
          ...e,
          createdAt: e.createdAt.toISOString()
        }))
      }
    }
  } catch (error) {
    await createLog('error', 'Failed to load superuser dashboard', {
      location: 'getSuperUserDashboardData',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    })
    return { success: false, error: 'Failed to load dashboard' }
  }
}

// ─── Inline actions ────────────────────────────────────────────────────────────

export async function deleteAnchor(id: string) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Unauthorized' }

    await prisma.anchor.delete({ where: { id } })
    return { success: true }
  } catch {
    return { success: false, error: 'Failed to delete' }
  }
}
