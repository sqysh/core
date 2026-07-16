import { Chapter, EventOrg, EventStatus, UserRole } from '@prisma/client'
import { Visitor } from './visitor.types'

export type SuperUserMember = {
  profileImage: any
  id: string
  name: string
  company: string
  title: string
  industry: string
  role: UserRole
  membershipStatus: string
  isMembership: boolean
  lastLoginAt: string | null
  joinedAt: string | null
  loginCount: number
  parleyCount: number
  referralCount: number
  closedCount: number
}

export type SuperUserParley = {
  id: string
  scheduledAt: string
  status: string
  notes: string | null
  requester: { id: string; name: string; company: string }
  recipient: { id: string; name: string; company: string }
  createdAt: string
}

export type SuperUserReferral = {
  id: string
  clientName: string
  serviceNeeded: string
  status: string
  createdAt: string
  giver: { id: string; name: string; company: string }
  receiver: { id: string; name: string; company: string }
}

export type SuperUserAnchor = {
  id: string
  businessValue: string
  description: string
  status: string
  closedDate: string
  createdAt: string
  giver: { id: string; name: string; company: string } | null
  receiver: { id: string; name: string; company: string } | null
}

export type SuperUserStats = {
  totalMembers: number
  activeMembers: number
  meetingsTotal: number
  referralsOpen: number
  closedTotal: string
}

export type SuperUserApplicant = {
  id: string
  name: string
  company: string
  industry: string
  email: string
  phone: string | null
  membershipStatus: string
  hasCompletedApplication: boolean
  businessLicenseNumber: string
  createdAt: string
  finalDecisionAt: string
}

export type SuperUserDashboardData = {
  stats: SuperUserStats
  members: SuperUserMember[]
  applicants: SuperUserApplicant[]
  parleys: SuperUserParley[]
  referrals: SuperUserReferral[]
  anchors: SuperUserAnchor[]
  chapter: Chapter
  visitors: Visitor[]
  events: SuperUserEvent[]
}

export interface SuperUserEvent {
  id: string
  name: string
  org: EventOrg
  description?: string | null
  externalLink?: string | null
  status: EventStatus
  createdAt: string
}

export interface SuperDispute {
  id: string
  status: 'PENDING' | 'RESOLVED' | 'REJECTED'
  createdAt: string
  user: { name: string }
  meeting: { date: string }
}
