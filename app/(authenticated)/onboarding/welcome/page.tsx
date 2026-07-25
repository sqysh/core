import { auth } from '@/app/lib/auth/auth'
import prisma from '@/prisma/client'
import { redirect } from 'next/navigation'
import WelcomeClient from './WelcomeClient'

export const dynamic = 'force-dynamic'

export default async function WelcomePage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      hasAnnualSubscription: true,
      hasQuarterlySubscription: true
    }
  })

  if (!user) redirect('/login')

  // If somehow they landed here without active subs, send them back to onboarding
  if (!user.hasAnnualSubscription || !user.hasQuarterlySubscription) {
    redirect('/onboarding')
  }

  const firstName = user.name?.split(' ')[0] ?? 'there'

  return <WelcomeClient firstName={firstName} />
}
