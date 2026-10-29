import { LeadershipPosition } from '@prisma/client'

interface PositionMeta {
  label: string
  seats: number
  isElected: boolean
  note?: string[]
}

export const POSITIONS: Record<LeadershipPosition, PositionMeta> = {
  HOST: { label: 'Host', seats: 1, isElected: true },
  CO_DIRECTOR: { label: 'Co-Director', seats: 2, isElected: true },
  EDUCATION_COORDINATOR: { label: 'Education Coordinator', seats: 1, isElected: true },
  SOCIAL_MEDIA_MANAGER: { label: 'Social Media Manager', seats: 1, isElected: true },
  VISITOR_COORDINATOR: {
    label: 'Visitor Coordinator',
    seats: 1,
    isElected: true,
    note: [
      'This seat is back because right now nobody actually owns it. A visitor shows up and someone from the Membership Committee is supposed to follow up, but with four people sharing that job it is easy for everyone to assume someone else did it.',
      'One person owning visitor follow-up means it always happens and nobody has to coordinate who is doing it.',
      'Membership Committee drops from 4 seats to 3 to make room.'
    ]
  },
  MEMBERSHIP_COMMITTEE: { label: 'Membership Committee', seats: 3, isElected: true },
  TREASURER: { label: 'Treasurer', seats: 1, isElected: true },
  DIGITAL_OPERATIONS_MANAGER: { label: 'Digital Operations Manager', seats: 1, isElected: false }
}

export const POSITION_ORDER = [
  'HOST',
  'CO_DIRECTOR',
  'TREASURER',
  'EDUCATION_COORDINATOR',
  'SOCIAL_MEDIA_MANAGER',
  'VISITOR_COORDINATOR',
  'MEMBERSHIP_COMMITTEE',
  'DIGITAL_OPERATIONS_MANAGER'
] as const satisfies readonly LeadershipPosition[]

export const ELECTED_POSITIONS = POSITION_ORDER.filter((p) => POSITIONS[p].isElected)

export const APPOINTED_HOLDERS: Partial<Record<LeadershipPosition, string>> = {
  TREASURER: 'rzyas8cegrox0w9n3l9p4bf6',
  DIGITAL_OPERATIONS_MANAGER: 'rzyas8cegrox0w9n3l9p4bf6'
}

export const APPOINTED_EMAIL = 'greg@sqysh.com'

export const APPOINTED_POSITIONS = POSITION_ORDER.filter((p) => !POSITIONS[p].isElected)
