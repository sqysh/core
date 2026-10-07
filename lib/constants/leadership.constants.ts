import { LeadershipPosition } from '@prisma/client'

interface PositionMeta {
  label: string
  seats: number
  isElected: boolean
}

export const POSITIONS: Record<LeadershipPosition, PositionMeta> = {
  HOST: { label: 'Host', seats: 1, isElected: true },
  VP: { label: 'Vice President', seats: 2, isElected: true },
  EDUCATION_COORDINATOR: { label: 'Education Coordinator', seats: 1, isElected: true },
  SOCIAL_MEDIA_MANAGER: { label: 'Social Media Manager', seats: 1, isElected: true },
  VISITOR_COORDINATOR: { label: 'Visitor Coordinator', seats: 1, isElected: true },
  MEMBERSHIP_COMMITTEE: { label: 'Membership Committee', seats: 3, isElected: true },
  TREASURER: { label: 'Treasurer', seats: 1, isElected: false },
  DIGITAL_OPERATIONS_MANAGER: { label: 'Digital Operations Manager', seats: 1, isElected: false }
}

export const POSITION_ORDER = [
  'HOST',
  'VP',
  'EDUCATION_COORDINATOR',
  'SOCIAL_MEDIA_MANAGER',
  'VISITOR_COORDINATOR',
  'MEMBERSHIP_COMMITTEE',
  'TREASURER',
  'DIGITAL_OPERATIONS_MANAGER'
] as const satisfies readonly LeadershipPosition[]

export const ELECTED_POSITIONS = POSITION_ORDER.filter((p) => POSITIONS[p].isElected)

export const APPOINTED_HOLDERS: Partial<Record<LeadershipPosition, string>> = {
  TREASURER: 'rzyas8cegrox0w9n3l9p4bf6',
  DIGITAL_OPERATIONS_MANAGER: 'rzyas8cegrox0w9n3l9p4bf6'
}

export const APPOINTED_EMAIL = 'greg@sqysh.com'

export const APPOINTED_POSITIONS = POSITION_ORDER.filter((p) => !POSITIONS[p].isElected)
