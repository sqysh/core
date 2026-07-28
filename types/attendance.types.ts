export type SquareStatus = 'attended' | 'reinstated' | 'missed' | 'future' | 'excluded'

export interface HistoryRow {
  date: string
  status: SquareStatus
  excludedReason?: string
  reinstatedAt?: string
}

interface HistorySummary {
  totalThursdays: number
  attended: number
  reinstated: number
  missed: number
  excluded: number
  countedTotal: number // attended + reinstated + missed
  percentage: number
}

export interface AttendanceHistoryClientProps {
  userName: string
  rows: HistoryRow[]
  summary: HistorySummary
  squares: AttendanceSquare[]
}

export interface UserAttendanceRow {
  reinstated: boolean
  meetingId: string
  date: string // YYYY-MM-DD
  attended: boolean
}

export interface AttendanceSquare {
  date: string // ISO date for the Thursday
  meetingId?: string
  status: SquareStatus
  isToday?: boolean
  excludedReason?: string
}

export interface AttendanceRow {
  date: string
  meetingId: string
  attended: boolean
  reinstated?: boolean
}

export interface AttendanceExclusion {
  date: string
  reason: string
}

export interface AttendanceCorrectionModalProps {
  open: boolean
  onClose: () => void
  date: string
  meetingId: string
}

export interface FloatingEmoji {
  id: string
  emoji: string
  x: number
}

export interface Member {
  id: string
  name: string
  company: string
  profileImage?: string | null
  profileVideo?: string | null
}
