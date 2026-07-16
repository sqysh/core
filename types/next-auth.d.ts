import { DefaultSession } from 'next-auth'
import { AdapterUser as BaseAdapterUser } from '@auth/core/adapters'
import { UserRole } from '@prisma/client'

declare module 'next-auth' {
  interface User {
    id: string
    role: UserRole
    isMembership?: boolean
    membershipStatus?: string
    signedInWith?: 'email' | 'secondaryEmail'
  }

  interface Session {
    user: {
      id: string
      role: UserRole
      isMembership?: boolean
      signedInWith?: 'email' | 'secondaryEmail'
    } & DefaultSession['user']
  }
}

declare module '@auth/core/adapters' {
  interface AdapterUser extends BaseAdapterUser {
    role: UserRole
    isMembership?: boolean
    membershipStatus?: string
    lastLoginAt?: Date
    signedInWith?: 'email' | 'secondaryEmail'
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    userId?: string
    role: UserRole
    isMembership?: boolean
    signedInWith?: 'email' | 'secondaryEmail'
  }
}
