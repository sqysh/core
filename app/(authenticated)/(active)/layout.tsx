import { redirect } from 'next/navigation'
import { auth } from '@/app/lib/auth'
import prisma from '@/prisma/client'
import GameAnnounceListener from '@/app/components/game/shared/GameAnnounceListener'

export default async function ActiveLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { membershipStatus: true, hasAnnualSubscription: true, hasQuarterlySubscription: true }
  })

  // Cancelled members go to onboarding to re-subscribe
  if (user?.membershipStatus === 'CANCELLED') {
    redirect('/onboarding')
  }

  // Authenticated but hasn't finished billing setup → onboarding
  // if (!user?.hasAnnualSubscription || !user?.hasQuarterlySubscription) {
  //   redirect('/onboarding')
  // }

  if (user?.membershipStatus !== 'ACTIVE') {
    redirect('/onboarding')
  }

  return (
    <>
      <GameAnnounceListener />
      {children}
    </>
  )
}
