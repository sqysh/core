import { getDashboardData } from '../getDashboardData'
import { getLinkedRecord } from '../getLinkedRecord'
import { getPresenterSchedule } from '../presenter-queue/getPresenterSchedule'

export async function getDashboardPageData(action?: string, id?: string) {
  const [dashboard, schedule, linkedRecord] = await Promise.all([
    getDashboardData(),
    getPresenterSchedule(),
    action && id ? getLinkedRecord(action, id) : Promise.resolve(null)
  ])

  if (!dashboard.success) return { success: false, error: dashboard.error }

  return {
    success: true,
    data: {
      ...dashboard.data,
      schedule,
      linkedRecord
    }
  }
}
