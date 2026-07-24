import prisma from '@/prisma/client'
import { PrismaAdapter } from '@auth/prisma-adapter'
import NextAuth from 'next-auth'
import googleProvider from './config/googleProvider'
import { magicLinkConfig } from './config/magicLinkConfig'
import { handleEmailCallback } from './callbacks/magic-link.callback'
import { handleGoogleCallback } from './callbacks/google.callback'
import { UserRole } from '@prisma/client'

export const { handlers, auth, signIn, signOut } = NextAuth({
  debug: true,
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60
  },
  adapter: PrismaAdapter(prisma),
  pages: { error: '/login' },
  providers: [googleProvider, magicLinkConfig],

  callbacks: {
    async signIn({ user, account, profile }) {
      switch (account?.provider) {
        case 'email':
          return handleEmailCallback(user)
        case 'google':
          return handleGoogleCallback(user, account, profile)
        default:
          return true
      }
    },

    async jwt({ token, user, account, profile }) {
      if (account?.provider === 'google' && profile?.email) {
        token.signInEmail = profile.email.toLowerCase()
      }

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
      }

      return token
    },

    async session({ session, token }) {
      if (token.userId && typeof token.userId === 'string') {
        session.user.id = token.userId
        session.user.role = token.role as UserRole
        session.user.isMembership = token.isMembership as boolean
        session.user.signInEmail = token.signInEmail as string | undefined
      }
      return session
    }
  }
})
