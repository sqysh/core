import { redirect } from 'next/navigation'
import { auth } from '@/app/lib/auth/auth'
import prisma from '@/prisma/client'

export default async function CancelledLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { membershipStatus: true }
  })

  if (user?.membershipStatus !== 'CANCELLED') {
    redirect('/dashboard')
  }

  return <>{children}</>
}
