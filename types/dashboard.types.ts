import { TABS } from '@/app/lib/constants/dashboard.constants'
import { UserAttendanceRow } from './attendance.types'
import { TEvent } from './event.types'
import { ScheduledPresenter } from './presenter-queue.types'
import { Visitor } from './visitor.types'

export interface ActivityItem {
  id: string
  type: 'MEETING' | 'REFERRAL' | 'CLOSED'
  label: string
  timeAgo: string
  clientPhone?: string
  businessValue?: number
}

interface DashboardStats {
  parleyThisWeek: number
  treasureMapsThisWeek: number
  anchorsThisWeek: number
  totalParleys: number
  totalTreasureMaps: number
  totalAnchors: number
  closedAmountThisWeek: string
  totalClosedAmount: string
}

export interface MemberDashboardProps {
  currentUser: {
    id?: string
    name: string
    initials: string
    email: string
    hasAnnualSubscription?: boolean
    hasQuarterlySubscription?: boolean
    weeklyTreasureWishlist?: string
    createdAt?: Date
  }
  members: any
  stats: DashboardStats
  recentActivity: ActivityItem[]
  schedule: {
    success: boolean
    data?: ScheduledPresenter[]
    error?: string
  }
  events: TEvent[]
  visitors: Visitor[]
  closestVisitorDay: string
  membership: {
    annualOrder: any
    quarterlyOrder: any
    paymentMethod: any
  }
  attendances: {
    success: boolean
    data?: {
      rows: UserAttendanceRow[]
      attended: number
      total: number
    }
    error?: string
  }
  exclusions: { reason: string; date: string }[]
}

export interface Member {
  id: string
  name: string
  industry: string | null
}

export interface QuickActionsProps {
  members: Member[]
  variant: 'card' | 'compact'
}

export type ModalKey = 'f2f' | 'referral' | 'closed' | null

export type Tab = (typeof TABS)[number]['key']

export type ActivityType = 'MEETING' | 'REFERRAL' | 'CLOSED'
