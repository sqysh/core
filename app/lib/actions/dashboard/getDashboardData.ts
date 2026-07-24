import prisma from '@/prisma/client'
import { fetchWeeklyStats } from './fetchWeeklyStats'
import { fetchAllTimeStats } from './fetchAllTimeStats'
import { fetchRecentActivity } from './fetchRecentActivity'
import { auth } from '../../auth'
import { getStartOfThursdayWeek } from '../../utils/date.utils'
import { chapterId } from '../../constants/api/chapterId'
import { getClosestVisitorDay } from '../visitor-day/getClosestVisitorDay'
import { fetchMembershipData } from './fetchMembershipData'
import { getUserAttendance } from '../attendance/getUserAttendance'
import { formatRecentActivity } from '../../utils/dashboard.utils'
import { getInitials } from '../../utils/shared.utils'

/**
 * Fetches all data needed to render the member dashboard in a single call.
 * Includes the current user, chapter members, weekly + lifetime stats,
 * recent activity feed, events, visitors, membership status, attendance, and
 * exclusions.
 */
export async function getDashboardData() {
  try {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' }

    const startOfWeek = getStartOfThursdayWeek()

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        role: true,
        email: true,
        chapterId: true,
        hasAnnualSubscription: true,
        hasQuarterlySubscription: true,
        weeklyTreasureWishlist: true,
        chapter: { select: { name: true } },
        createdAt: true
      }
    })
    if (!user) return { success: false, error: 'User not found' }

    // Fire every query in parallel
    const [
      members,
      weekly,
      allTime,
      recent,
      events,
      visitors,
      closestVisitorDay,
      membershipData,
      attendances,
      cancelledMeetings,
      paymentMethodCount
    ] = await Promise.all([
      prisma.user.findMany({
        where: {
          chapterId: user.chapterId ?? undefined,
          id: { not: user.id },
          membershipStatus: 'ACTIVE'
        },
        select: { id: true, name: true, industry: true, phone: true, email: true, weeklyTreasureWishlist: true },
        orderBy: { name: 'asc' }
      }),
      fetchWeeklyStats(user.id, startOfWeek),
      fetchAllTimeStats(user.id),
      fetchRecentActivity(user.id),
      prisma.event.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          org: true,
          name: true,
          description: true,
          externalLink: true,
          createdAt: true,
          status: true
        }
      }),
      prisma.visitor.findMany({
        where: { chapterId, visitDate: { gte: new Date() } },
        orderBy: { visitDate: 'asc' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          visitDate: true,
          createdAt: true,
          invitedBy: { select: { name: true } }
        }
      }),
      getClosestVisitorDay(),
      fetchMembershipData(user.id),
      getUserAttendance(),
      prisma.cancelledMeeting.findMany({
        where: { chapterId },
        select: { date: true, reason: true }
      }),
      prisma.paymentMethod.count({
        where: { userId: user.id }
      })
    ])

    // Derive stats from the raw query results
    const closedAmountThisWeek = `$${weekly.anchorsThisWeek.reduce((sum, a) => sum + Number(a.businessValue), 0).toLocaleString()}`
    const totalClosedAmount = `$${allTime.totalAnchors.reduce((sum, a) => sum + Number(a.businessValue), 0).toLocaleString()}`

    return {
      success: true,
      data: {
        currentUser: {
          id: user.id,
          name: user.name ?? 'Member',
          role: user.role,
          initials: getInitials(user.name ?? ''),
          email: user.email,
          hasAnnualSubscription: user.hasAnnualSubscription,
          hasQuarterlySubscription: user.hasQuarterlySubscription,
          weeklyTreasureWishlist: user.weeklyTreasureWishlist,
          createdAt: user.createdAt
        },
        members,
        stats: {
          parleyThisWeek: weekly.parleyThisWeek,
          treasureMapsThisWeek: weekly.treasureMapsThisWeek,
          anchorsThisWeek: weekly.anchorsThisWeek.length,
          totalParleys: allTime.totalParleys,
          totalTreasureMaps: allTime.totalTreasureMaps,
          totalAnchors: allTime.totalAnchors.length,
          totalClosedAmount,
          closedAmountThisWeek
        },
        recentActivity: formatRecentActivity(user.id, recent.recentParleys, recent.recentMaps, recent.recentAnchors),
        events: events.map((e) => ({ ...e, createdAt: e.createdAt.toISOString() })),
        visitors: visitors.map((v) => ({ ...v, createdAt: v.createdAt.toISOString() })),
        closestVisitorDay,
        membership: {
          annualOrder: membershipData?.orders.find((o) => o.type === 'ANNUAL') ?? null,
          quarterlyOrder: membershipData?.orders.find((o) => o.type === 'QUARTERLY') ?? null,
          paymentMethod: membershipData?.paymentMethods[0] ?? null
        },
        attendances,
        exclusions: cancelledMeetings.map((c) => ({
          date: c.date.toISOString().slice(0, 10),
          reason: c.reason || 'Cancelled'
        })),
        hasPaymentMethod: paymentMethodCount > 0
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load dashboard'
    }
  }
}
