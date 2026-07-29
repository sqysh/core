import prisma from '@/prisma/client'
import { fetchWeeklyStats } from './queries/fetchWeeklyStats'
import { fetchAllTimeStats } from './queries/fetchAllTimeStats'
import { fetchRecentActivity } from './queries/fetchRecentActivity'
import { auth } from '../../auth/auth'
import { getStartOfThursdayWeek } from '../../utils/date.utils'
import { getClosestVisitorDay } from '../visitor-day/getClosestVisitorDay'
import { fetchMembershipData } from './queries/fetchMembershipData'
import { getUserAttendance } from '../attendance/getUserAttendance'
import { formatRecentActivity } from '../../utils/dashboard.utils'
import { getInitials } from '../../utils/shared.utils'
import { getOtherActiveMembers } from './queries/getOtherActiveMembers'
import { getEvents } from './queries/getEvents'
import { getErrorMessage } from '@/lib/utils/api/getErrorMessage'
import { getVisitors } from './queries/getVisitors'
import { getCancelledMeetings } from './queries/getCancelledMeetings'
import { getUserPaymentMethods } from './queries/getUserPaymentMethods'
import { getPresenterSchedule } from '../presenter-queue/getPresenterSchedule'

/**
 * Fetches all data needed to render the member dashboard in a single call.
 * Includes the current user, chapter members, weekly + lifetime stats,
 * recent activity feed, events, visitors, membership status, attendance, and
 * exclusions.
 */
export async function getUserDashboard() {
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

    const [
      members,
      weekly,
      allTime,
      recent,
      rawEvents,
      rawVisitors,
      closestVisitorDay,
      membershipData,
      attendances,
      cancelledMeetings,
      paymentMethodCount,
      schedule
    ] = await Promise.all([
      getOtherActiveMembers(user),
      fetchWeeklyStats(user.id, startOfWeek),
      fetchAllTimeStats(user.id),
      fetchRecentActivity(user.id),
      getEvents(),
      getVisitors(),
      getClosestVisitorDay(),
      fetchMembershipData(user.id),
      getUserAttendance(),
      getCancelledMeetings(),
      getUserPaymentMethods(user.id),
      getPresenterSchedule()
    ])

    const closedAmountThisWeek = `$${weekly.anchorsThisWeek.reduce((sum, a) => sum + Number(a.businessValue), 0).toLocaleString()}`
    const totalClosedAmount = `$${allTime.totalAnchors.reduce((sum, a) => sum + Number(a.businessValue), 0).toLocaleString()}`

    const currentUser = {
      id: user.id,
      name: user.name ?? 'Member',
      role: user.role,
      initials: getInitials(user.name ?? ''),
      email: user.email,
      hasAnnualSubscription: user.hasAnnualSubscription,
      hasQuarterlySubscription: user.hasQuarterlySubscription,
      weeklyTreasureWishlist: user.weeklyTreasureWishlist,
      createdAt: user.createdAt
    }

    const stats = {
      parleyThisWeek: weekly.parleyThisWeek,
      treasureMapsThisWeek: weekly.treasureMapsThisWeek,
      anchorsThisWeek: weekly.anchorsThisWeek.length,
      totalParleys: allTime.totalParleys,
      totalTreasureMaps: allTime.totalTreasureMaps,
      totalAnchors: allTime.totalAnchors.length,
      totalClosedAmount,
      closedAmountThisWeek
    }

    const recentActivity = formatRecentActivity(user.id, recent.recentParleys, recent.recentMaps, recent.recentAnchors)

    const events = rawEvents.map((e) => ({ ...e, createdAt: e.createdAt.toISOString() }))

    const visitors = rawVisitors.map((v) => ({
      ...v,
      createdAt: v.createdAt.toISOString(),
      visitDate: v.visitDate.toISOString()
    }))

    const membership = {
      annualOrder: membershipData?.orders.find((o) => o.type === 'ANNUAL') ?? null,
      quarterlyOrder: membershipData?.orders.find((o) => o.type === 'QUARTERLY') ?? null,
      paymentMethod: membershipData?.paymentMethods[0] ?? null
    }

    const exclusions = cancelledMeetings.map((c) => ({
      date: c.date.toISOString().slice(0, 10),
      reason: c.reason || 'Cancelled'
    }))

    const hasPaymentMethod = paymentMethodCount > 0

    return {
      success: true,
      data: {
        currentUser,
        members,
        stats,
        recentActivity,
        events,
        visitors,
        closestVisitorDay,
        membership,
        attendances,
        exclusions,
        hasPaymentMethod,
        schedule
      }
    }
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error)
    }
  }
}
