import prisma from '@/prisma/client'
import { auth } from '../auth'
import { getInitials } from '../utils/common/getInitials'
import { timeAgo } from '../utils/time.utils'
import { getClosestVisitorDay } from './visitor-day/getClosestVisitorDay'

export async function getDashboardData() {
  try {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' }

    const now = new Date()
    const dayOfWeek = now.getDay()
    const diffToThursday = (dayOfWeek + 3) % 7
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - diffToThursday)
    startOfWeek.setHours(0, 0, 0, 0)

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        secondaryEmail: true,
        chapterId: true,
        hasAnnualSubscription: true,
        hasQuarterlySubscription: true,
        weeklyTreasureWishlist: true,
        chapter: { select: { name: true } }
      }
    })
    if (!user) return { success: false, error: 'User not found' }

    // chapter members (excluding self)
    const members = await prisma.user.findMany({
      where: {
        chapterId: user.chapterId ?? undefined,
        id: { not: user.id },
        membershipStatus: 'ACTIVE'
      },
      select: { id: true, name: true, industry: true, phone: true, email: true, weeklyTreasureWishlist: true },
      orderBy: { name: 'asc' }
    })

    const [
      parleyThisWeek,
      treasureMapsThisWeek,
      anchorsThisWeekData,
      totalParleys,
      totalTreasureMaps,
      totalAnchorsData,
      events,
      visitors,
      closestVisitorDay,
      membershipData
    ] = await Promise.all([
      prisma.parley.count({
        where: {
          OR: [{ requesterId: user.id }, { recipientId: user.id }],
          scheduledAt: { gte: startOfWeek }
        }
      }),
      prisma.treasureMap.count({
        where: {
          OR: [{ giverId: user.id }, { receiverId: user.id }],
          createdAt: { gte: startOfWeek }
        }
      }),
      prisma.anchor.findMany({
        where: {
          OR: [{ giverId: user.id }, { receiverId: user.id }],
          closedDate: { gte: startOfWeek }
        },
        select: { businessValue: true }
      }),
      prisma.parley.count({
        where: { OR: [{ requesterId: user.id }, { recipientId: user.id }] }
      }),
      prisma.treasureMap.count({
        where: { OR: [{ giverId: user.id }, { receiverId: user.id }] }
      }),
      prisma.anchor.findMany({
        where: { OR: [{ giverId: user.id }, { receiverId: user.id }] },
        select: { businessValue: true }
      }),
      prisma.event.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          org: true,
          name: true,
          description: true,
          externalLink: true,
          createdAt: true
        }
      }),
      prisma.visitor.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          visitDate: true,
          createdAt: true,
          invitedBy: {
            select: { name: true }
          }
        }
      }),
      getClosestVisitorDay(),
      await prisma.user
        .findUnique({
          where: { id: user.id },
          select: {
            orders: {
              where: { status: 'ACTIVE' },
              select: { type: true, currentPeriodEnd: true }
            },
            paymentMethods: {
              where: { isDefault: true },
              select: {
                id: true,
                brand: true,
                last4: true,
                expMonth: true,
                expYear: true,
                stripePaymentMethodId: true
              },
              take: 1
            }
          }
        })
        .catch(() => null)
    ])

    const anchorsThisWeek = anchorsThisWeekData.length
    const closedAmountThisWeek = `$${anchorsThisWeekData.reduce((sum, a) => sum + Number(a.businessValue), 0).toLocaleString()}`

    const totalAnchors = totalAnchorsData.length
    const totalClosedAmount = `$${totalAnchorsData.reduce((sum, a) => sum + Number(a.businessValue), 0).toLocaleString()}`

    // recent activity — merged + sorted
    const [recentParleys, recentMaps, recentAnchors] = await Promise.all([
      prisma.parley.findMany({
        where: { OR: [{ requesterId: user.id }, { recipientId: user.id }] },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          createdAt: true,
          requesterId: true,
          requester: { select: { name: true } },
          recipient: { select: { name: true } }
        }
      }),
      prisma.treasureMap.findMany({
        where: { OR: [{ giverId: user.id }, { receiverId: user.id }] }, // ← both directions
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          createdAt: true,
          giverId: true,
          clientName: true,
          clientPhone: true,
          giver: { select: { name: true } },
          receiver: { select: { name: true } }
        }
      }),
      prisma.anchor.findMany({
        where: { OR: [{ giverId: user.id }, { receiverId: user.id }] },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          createdAt: true,
          businessValue: true,
          receiverId: true,
          giver: { select: { name: true } },
          receiver: { select: { name: true } }
        }
      })
    ])

    const recentActivity = [
      ...recentParleys.map((p) => ({
        id: p.id,
        type: 'MEETING' as const,
        label:
          p.requesterId === user.id
            ? `Face-2-Face · You → ${p.recipient.name}`
            : `Face-2-Face · ${p.requester.name} → You`,
        createdAt: p.createdAt
      })),
      ...recentMaps.map((m) => ({
        id: m.id,
        type: 'REFERRAL' as const,
        label:
          m.giverId === user.id
            ? `Referral · You → ${m.receiver.name} · ${m.clientName}`
            : `Referral · ${m.giver.name} → You · ${m.clientName}`,
        clientPhone: m.clientPhone ?? null,
        createdAt: m.createdAt
      })),
      ...recentAnchors.map((a) => ({
        id: a.id,
        type: 'CLOSED' as const,
        label:
          a.receiverId === user.id
            ? `Closed · ${a.giver?.name ?? 'External'} → You · $${Number(a.businessValue).toLocaleString()}`
            : `Closed · You → ${a.receiver?.name ?? 'External'} · $${Number(a.businessValue).toLocaleString()}`,
        createdAt: a.createdAt,
        businessValue: Number(a.businessValue)
      }))
    ]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((a) => ({
        ...a,
        timeAgo: timeAgo(a.createdAt.toISOString()),
        createdAt: a.createdAt.toISOString()
      }))

    return {
      success: true,
      data: {
        currentUser: {
          id: user.id,
          name: user.name ?? 'Member',
          initials: getInitials(user.name ?? ''),
          email: user.email,
          secondaryEmail: user.secondaryEmail,
          hasAnnualSubscription: user.hasAnnualSubscription,
          hasQuarterlySubscription: user.hasQuarterlySubscription,
          weeklyTreasureWishlist: user.weeklyTreasureWishlist
        },
        members,
        stats: {
          parleyThisWeek,
          treasureMapsThisWeek,
          anchorsThisWeek,
          totalParleys,
          totalTreasureMaps,
          totalAnchors,
          totalClosedAmount,
          closedAmountThisWeek
        },
        recentActivity,
        events: events.map((e) => ({
          ...e,
          createdAt: e.createdAt.toISOString()
        })),
        visitors: visitors.map((e) => ({
          ...e,
          createdAt: e.createdAt.toISOString()
        })),
        closestVisitorDay,
        membership: {
          annualOrder: membershipData?.orders.find((o) => o.type === 'ANNUAL') ?? null,
          quarterlyOrder: membershipData?.orders.find((o) => o.type === 'QUARTERLY') ?? null,
          paymentMethod: membershipData?.paymentMethods[0] ?? null
        }
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load dashboard'
    }
  }
}
