import { auth } from '@/lib/auth/auth'
import { redirect } from 'next/navigation'
import prisma from '@/prisma/client'
import { chapterId } from '@/lib/constants/api/chapterId'
import { SuperSettingsClient } from './SuperSettingsClient'

export const dynamic = 'force-dynamic'

export default async function SuperSettingsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  if (session.user.role !== 'SUPER_USER') redirect('/dashboard')

  const chapter = await prisma.chapter.findUniqueOrThrow({
    where: { id: chapterId },
    select: {
      name: true,
      location: true,
      meetingDay: true,
      meetingTime: true,
      meetingFrequency: true,
      hasUnlockedBooty: true,
      hasUnlockedGrog: true,
      hasUnlockedMuster: true
    }
  })

  return <SuperSettingsClient chapter={chapter} />
}
