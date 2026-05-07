import { redirect } from 'next/navigation'
import { auth } from '@/app/lib/auth'
import DashboardClient from '@/app/components/pages/DashboardClient'
import { getDashboardPageData } from '@/app/lib/actions/dashboard/getDashboardPageData'

export default async function DashboardPage({
  searchParams
}: {
  searchParams: Promise<{ action?: string; id?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect('/auth/login')

  const { action, id } = await searchParams

  const result = await getDashboardPageData(action, id)

  if (!result.success || !result.data) {
    return (
      <div className="min-h-screen bg-bg-light dark:bg-bg-dark flex items-center justify-center px-4">
        <p className="font-nunito text-sm text-muted-light dark:text-muted-dark text-center">
          Unable to load your dashboard. Please refresh.
        </p>
      </div>
    )
  }

  const {
    currentUser,
    members,
    stats,
    recentActivity,
    events,
    visitors,
    closestVisitorDay,
    schedule,
    linkedRecord,
    membership
  } = result.data

  return (
    <DashboardClient
      currentUser={currentUser}
      members={members}
      stats={stats}
      recentActivity={recentActivity}
      schedule={schedule.data}
      linkedRecord={linkedRecord}
      events={events}
      visitors={visitors}
      closestVisitorDay={closestVisitorDay}
      membership={membership}
    />
  )
}
