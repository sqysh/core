import prisma from '@/prisma/client'
import { createLog } from '../utils/api/createLog'

export async function handleEmailCallback(user) {
  try {
    const dbUser = await prisma.user.findUnique({
      where: { email: user.email! }
    })

    // No account found — email not registered in CORE
    if (!dbUser) {
      await createLog('warning', `Sign-in blocked — email not found in system: ${user.email}`, {
        location: ['auth.ts - signIn'],
        name: 'SignInBlockedNoAccount',
        timestamp: new Date().toISOString(),
        email: user.email
      })
      return false
    }

    // Account exists but membership is not ACTIVE
    if (dbUser.membershipStatus === 'PENDING' || dbUser.membershipStatus === 'CANCELLED') {
      await createLog('warning', `Sign-in blocked — membership is ${dbUser.membershipStatus}: ${user.email}`, {
        location: ['auth.ts - signIn'],
        name: 'SignInBlockedInactiveMember',
        timestamp: new Date().toISOString(),
        email: user.email,
        userId: dbUser.id,
        membershipStatus: dbUser.membershipStatus
      })
      return false
    }

    // Success — update last login timestamp
    await prisma.user.update({
      where: { id: dbUser.id },
      data: { lastLoginAt: new Date(), emailVerified: new Date() }
    })

    await createLog('info', `${dbUser.name} signed in successfully`, {
      location: ['auth.ts - signIn'],
      name: 'SignInSuccess',
      timestamp: new Date().toISOString(),
      email: user.email,
      userId: dbUser.id,
      userName: dbUser.name
    })

    return true
  } catch (error) {
    await createLog('error', `Sign-in failed with unexpected error for ${user.email}`, {
      location: ['auth.ts - signIn'],
      name: 'SignInError',
      timestamp: new Date().toISOString(),
      email: user.email,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return false
  }
}
