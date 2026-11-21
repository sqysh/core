import type { Adapter } from 'next-auth/adapters'
import prisma from '@/prisma/client'

// A member can sign in with any address registered to their account (UserEmail), not only the one on their profile
// (User.email); Google sign-in has always worked this way. Auth.js finds the member for a magic link by email through
// the adapter, so the adapter's lookup has to know the registered addresses too. Without that the link request is
// denied for every alternate address, and a completed link would create a second, empty account for it.
//
// The profile address still wins when both could match. Nothing about who may sign in changes: the signIn callback
// (handleEmailCallback) still requires the account to exist and its membership not be PENDING or CANCELLED, and the
// link is still only ever delivered to, and usable by whoever controls, the address that was typed.

export function withRegisteredEmails(adapter: Adapter): Adapter {
  return {
    ...adapter,
    async getUserByEmail(email) {
      const own = await adapter.getUserByEmail!(email)
      if (own) return own
      const registered = await prisma.userEmail.findUnique({
        where: { email: email.toLowerCase() },
        select: { userId: true }
      })
      return registered ? adapter.getUser!(registered.userId) : null
    }
  }
}
