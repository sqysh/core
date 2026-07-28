import { getPresenterQueue } from '@/lib/actions/presenter-queue/getPresenterQueue'
import SuperPresenterQueueClient from './SuperPresenterQueueClient'
import { getAvailableMembers } from '@/lib/actions/presenter-queue/getAvailableMembers'
import { getCancelledMeetings } from '@/lib/actions/cancelled-meeting/getCancelledMeetings'
import { getVisitorDays } from '@/lib/actions/visitor-day/getVisitorDays'
import { getUpcomingMeetingDates } from '@/lib/utils/presenter-engine.utils'
import { auth } from '@/lib/auth/auth'

export default async function SuperPresenterQueuePage() {
  const [queue, availableMembers, cancelledMeetings, visitorDays, session] = await Promise.all([
    getPresenterQueue(),
    getAvailableMembers(),
    getCancelledMeetings(),
    getVisitorDays(),
    auth()
  ])

  const cancelledDates = cancelledMeetings.data?.map((c) => c.date) ?? []
  const visitorDates = visitorDays.data?.map((v) => v.date) ?? []
  const queueData = queue.data ?? []

  const dates = getUpcomingMeetingDates(cancelledDates, visitorDates, queueData.length + 20)
  const startIndex = 0
  return (
    <SuperPresenterQueueClient
      availableMembers={availableMembers.data ?? []}
      dates={dates}
      initialQueue={queueData}
      startIndex={startIndex}
      currentUserId={session.user?.id ?? ''}
    />
  )
}
