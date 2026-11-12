import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/auth'
import prisma from '@/prisma/client'
import GuidingLightListener from '@/components/layout/GuidingLightListener'
import TreasurerListener from '@/components/layout/TreasurerListener'
import GameAnnounceListener from '@/components/game/shared/GameAnnounceListener'
import ElectionListener from '@/components/layout/ElectionListener'
import { LivePoll } from './polls/LivePoll'

export default async function ActiveLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { membershipStatus: true }
  })

  if (user?.membershipStatus === 'CANCELLED') {
    redirect('/membership/cancelled')
  }

  if (user?.membershipStatus !== 'ACTIVE') {
    redirect('/onboarding')
  }

  return (
    <>
      <GuidingLightListener />
      <TreasurerListener />
      <GameAnnounceListener />
      <ElectionListener />

      <LivePoll />

      {children}
    </>
  )
}
