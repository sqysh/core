import { LinkedRecord } from './common'
import { TEvent } from './event'
import { ScheduledPresenter } from './presenter-queue'
import { Visitor } from './visitor'

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
    secondaryEmail?: string
    hasAnnualSubscription?: boolean
    hasQuarterlySubscription?: boolean
    weeklyTreasureWishlist?: string
  }
  members: any
  stats: DashboardStats
  recentActivity: ActivityItem[]
  schedule: ScheduledPresenter[]
  linkedRecord: LinkedRecord
  events: TEvent[]
  visitors: Visitor[]
  closestVisitorDay: string
  membership: {
    annualOrder: any
    quarterlyOrder: any
    paymentMethod: any
  }
}
