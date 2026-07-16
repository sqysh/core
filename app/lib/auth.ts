import prisma from '@/prisma/client'
import { PrismaAdapter } from '@auth/prisma-adapter'
import NextAuth from 'next-auth'
import googleProvider from './config/googleProvider'
import { magicLinkConfig } from './config/magicLinkConfig'
import { handleEmailCallback } from './callbacks/handleEmailCallback'
import { handleGoogleCallback } from './callbacks/handleGoogleCallback'
import { UserRole } from '@prisma/client'

export const { handlers, auth, signIn, signOut } = NextAuth({
  debug: false,
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60
  },
  adapter: PrismaAdapter(prisma),
  pages: { error: '/login' },
  providers: [googleProvider, magicLinkConfig],

  callbacks: {
    async signIn({ user, account }) {
      switch (account?.provider) {
        case 'email':
          user.signedInWith = 'email'
          return handleEmailCallback(user)
        case 'google':
          user.signedInWith = 'secondaryEmail'
          return handleGoogleCallback(user, account)
        default:
          return true
      }
    },

    async jwt({ token, user, account }) {
      if (!user?.id) return token

      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          role: true,
          isMembership: true
        }
      })

      if (dbUser) {
        token.userId = dbUser.id
        token.role = dbUser.role
        token.isMembership = dbUser.isMembership
        token.signedInWith = account?.provider === 'google' ? 'secondaryEmail' : 'email'
      }

      return token
    },

    async session({ session, token }) {
      if (token.userId && typeof token.userId === 'string') {
        session.user.id = token.userId
        session.user.role = token.role as UserRole
        session.user.isMembership = token.isMembership as boolean
        session.user.signedInWith = token.signedInWith as 'email' | 'secondaryEmail'
      }
      return session
    }
  }
})
