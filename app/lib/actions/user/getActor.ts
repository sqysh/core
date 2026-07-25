import prisma from '@/prisma/client'
import { auth } from '../../auth/auth'
import { Session } from 'next-auth'

export async function getActor(session?: Session | null) {
  const resolvedSession = session ?? (await auth())
  const user = await prisma.user
    .findUnique({
      where: { email: resolvedSession?.user?.email ?? '' },
      select: { name: true, email: true }
    })
    .catch(() => null)
  return `${user?.name ?? ''}`.trim() || user?.email || 'unknown'
}
