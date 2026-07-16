import { Anchor, Parley, UserRole } from '@prisma/client'
import { JsonValue } from '@prisma/client/runtime/library'

// Base User interface matching your Prisma User model
export interface User {
  id: string
  createdAt: Date
  updatedAt: Date

  // Basic info
  name: string
  email: string
  phone?: string | null
  company: string
  industry: string
  location?: string | null
  bio?: string | null
  title?: string | null
  website?: string | null
  yearsInBusiness?: string | null
  businessLicenseNumber?: string | null
  isLicensed?: boolean | null

  // Membership & Chapter
  chapterId: string
  membershipStatus: MembershipStatus
  joinedAt?: Date | null
  expiresAt?: Date | null

  // Verification & workflow
  hasCompletedApplication: boolean
  rejectedAt?: string | null
  rejectionReason?: string | null
  backgroundCheckCompletedAt?: string | null
  finalDecisionAt?: string | null
  initialReviewCompletedAt?: string | null
  rejectedStep?: string | null
  isBackgroudCheckCompleted?: boolean
  isInitialReviewCompleted?: boolean
  isFinalDecisionMade?: boolean
  isRejected?: boolean

  // Role & Permissions
  role: UserRole
  isMembership?: boolean

  // Profile & Networking
  interests: string[]
  isPublic?: boolean
  profileImage?: string | null
  profileImageFilename?: string | null
  profileVideo?: string | null
  profileVideoFilename?: string | null
  image?: string | null
  lastLoginAt?: Date | null

  // Professional Goals & Media
  goal?: string | null
  collage?: any | null
  coverImage?: string | null
  coverImageFilename?: string | null

  // Social & Online Presence
  facebookUrl?: string | null
  threadsUrl?: string | null
  youtubeUrl?: string | null
  xUrl?: string | null
  linkedInUrl?: string | null
  portfolioUrl?: string | null

  // Content & Communication
  posts?: any | null
  podcasts?: any | null

  // Skills & Professional Development
  skills: string[]
  careerAchievements?: JsonValue | [] | null // JSON in DB, cast to array
  learningGoals: string[]

  // Services & Professional Network
  servicesOffered?: any | null
  professionalAssociations?: any | null
  professionalBooks?: any | null

  // Projects & Expertise
  sideProjects?: any | null
  askMeAbout?: any | null

  // Other
  signals?: any | null
  weeklyTreasureWishlist?: string | null

  // Relationships
  accounts?: Account[]
  givenCredits?: Anchor[]
  receivedCredits?: Anchor[]
  logs?: Log[]
  receivedMeetings?: Parley[]
  requestedMeetings?: Parley[]
  sessions?: Session[]

  // Prisma optional arrays
  specialties?: string[]
}

// Usership status enum
export type MembershipStatus =
  | 'FLAGGED'
  | 'PENDING'
  | 'ACTIVE'
  | 'INACTIVE'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'SUSPENDED'
  | 'REJECTED'
  | 'INITIAL_REVIEW'
  | 'BACKGROUND_CHECK'
  | 'FINAL_DECISION'

// Chapter interface (basic version)
export interface Chapter {
  id: string
  name: string
  location: string
  meetingDay: string
  meetingTime: string
  meetingFrequency: string
  createdAt?: string | Date
  updatedAt?: string | Date
  hasUnlockedMuster: boolean
  hasUnlockedBooty: boolean
  hasUnlockedGrog: boolean
}

// User with chapter details (for display)
export interface UserWithChapter extends User {
  chapter: Chapter
}

// User form data (for creating/updating)
export interface UserFormData {
  name: string
  email: string
  phone?: string
  company: string
  profession: string
  chapterId: string
  joinedAt?: string
  expiresAt?: string
  membershipStatus: MembershipStatus
  interests: string[]
  profileImage?: string
  profileImageFilename?: string
  isPublic: boolean
}

// User profile (for detailed views)
export interface UserProfile extends User {
  chapter: Chapter
  recentMeetings?: Parley[]
  totalMeetings?: number
  totalReferrals?: number
}

// User filters (for search/filtering)
export interface UserFilters {
  search?: string
  membershipStatus?: MembershipStatus | 'all'
  chapterId?: string | 'all'
  interests?: string[]
  joinedAfter?: string
  joinedBefore?: string
  expiringWithinDays?: number
  page?: number
  limit?: number
}

// User pagination
export interface UserPagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

// User API responses
export interface GetUsersResponse {
  success: boolean
  members: User[]
  pagination: UserPagination
}

export interface GetUserResponse {
  success: boolean
  member: UserWithChapter
}

export interface UpdateUserResponse {
  user: { id: string; data: any }
  success: boolean
  message: string
  member: UserWithChapter
}

export interface DeleteUserResponse {
  success: boolean
  message: string
}

// User statistics
export interface UserStats {
  total: number
  active: number
  pending: number
  expired: number
  inactive: number
  suspended: number
  newThisMonth: number
  expiringThisMonth: number
}

export interface Account {
  id: string
  type: string
  provider: string
  providerAccountId: string
}

export interface Session {
  id: string
  sessionToken: string
  expires: string
}

export interface Log {
  id: string
  action: string
  details: any
  createdAt: string
}

export interface UserWithMeta extends User {
  meta: {
    chapterId: string
    lastUpdated: string
    membership: {
      expiresAt: string
      isExpiringWithin30Days: boolean
      joinedDaysAgo: number
      status: string
    }
    profileCompleteness: {
      isComplete: boolean
      missingFields: string[]
    }
  }
  chapter: Chapter
}

export interface CreateUserInput {
  name: string
  email: string
  phone: string | null
  company: string
  industry: string
  location: string
  businessLicenseNumber: string
}

export interface CreateUserResponse {
  success?: any
  user: any
  error?: string
  fieldErrors?: any[]
}

export type ProfileData = {
  id: string
  name: string
  email: string
  secondaryEmail: string
  phone: string
  company: string
  isPublic: boolean
  profileImage: string | null
  profileImageFilename: string | null
  profileVideo: string | null
  profileVideoFilename: string | null
  location: string
  bio: string
  businessLicenseNumber: string
  industry: string
  title: string
  website: string
  yearsInBusiness: string
  facebookUrl: string
  goal: string
  linkedInUrl: string
  threadsUrl: string
  xUrl: string
  youtubeUrl: string
  weeklyTreasureWishlist: string
}

export type UpdateProfileInput = Partial<Omit<ProfileData, 'email'>>
