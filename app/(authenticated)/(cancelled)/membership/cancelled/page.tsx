import { auth } from '@/app/lib/auth/auth'
import prisma from '@/prisma/client'
import { redirect } from 'next/navigation'
import { CancelledMembershipClient } from './CancelledMembershipClient'

export const dynamic = 'force-dynamic'

export default async function CancelledMembershipPage() {
  const session = await auth()
  // if (!session?.user?.id) {
  //   redirect('/login')
  // }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      membershipStatus: true,
      annualSubscriptionId: true,
      quarterlySubscriptionId: true
    }
  })

  // if (!user) {
  //   redirect('/login')
  // }

  //   if (user.membershipStatus !== 'CANCELLED') {
  //     redirect('/dashboard')
  //   }

  // Find the latest period end across the user's active orders
  const subIds = [user.annualSubscriptionId, user.quarterlySubscriptionId].filter(Boolean) as string[]

  let accessEndsAt: Date | null = null
  if (subIds.length > 0) {
    const orders = await prisma.order.findMany({
      where: {
        userId: user.id,
        stripeSubId: { in: subIds },
        status: { in: ['ACTIVE', 'CANCELLED'] }
      },
      select: { currentPeriodEnd: true },
      orderBy: { currentPeriodEnd: 'desc' }
    })

    if (orders.length > 0) {
      accessEndsAt = orders[0].currentPeriodEnd
    }
  }

  return (
    <CancelledMembershipClient
      userName={user.name}
      userEmail={user.email}
      accessEndsAt={accessEndsAt?.toISOString() ?? null}
    />
  )
}
