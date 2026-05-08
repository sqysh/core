import { redirect } from 'next/navigation'
import { auth } from '@/app/lib/auth'
import SuperDashClient from '@/app/components/pages/SuperDashClient'
import { getSuperUserDashboardData } from '@/app/lib/actions/super-user/superUserActions'
import { getUpcomingMeetingDates } from '@/app/lib/utils/presenter-engine'
import { getVisitorDays } from '@/app/lib/actions/visitor-day/getVisitorDays'
import { getPresenterQueue } from '@/app/lib/actions/presenter-queue/getPresenterQueue'
import { getAvailableMembers } from '@/app/lib/actions/presenter-queue/getAvailableMembers'
import { getCancelledMeetings } from '@/app/lib/actions/cancelled-meeting/getCancelledMeetings'

export default async function SuperDashPage() {
  const session = await auth()
  if (!session?.user?.isSuperUser) redirect('/login')

  const [result, queue, availableMembers, cancelledMeetings, visitorDays] = await Promise.all([
    getSuperUserDashboardData(),
    getPresenterQueue(),
    getAvailableMembers(),
    getCancelledMeetings(),
    getVisitorDays()
  ])

  if (!result.success || !result.data) {
    return (
      <div className="min-h-screen bg-bg-light dark:bg-bg-dark flex items-center justify-center px-4">
        <p className="font-nunito text-sm text-muted-light dark:text-muted-dark text-center">
          Unable to load dashboard. Please refresh.
        </p>
      </div>
    )
  }

  const cancelledDates = cancelledMeetings.data?.map((c) => c.date) ?? []
  const visitorDates = visitorDays.data?.map((v) => v.date) ?? []
  const queueData = queue.data ?? []

  const dates = getUpcomingMeetingDates(cancelledDates, visitorDates, queueData.length + 20)
  const startIndex = 0

  return (
    <SuperDashClient
      data={result.data}
      queue={queueData}
      availableMembers={availableMembers.data ?? []}
      cancelledMeetings={cancelledMeetings.data ?? []}
      visitorDays={visitorDays.data ?? []}
      dates={dates}
      startIndex={startIndex}
      chapter={result.data.chapter}
      events={result.data.events}
    />
  )
}
