import { getPresenterSchedule } from '../presenter-queue/getPresenterSchedule'
import { getDashboardData } from './getDashboardData'

export async function getDashboardPageData() {
  const [dashboard, schedule] = await Promise.all([getDashboardData(), getPresenterSchedule()])

  if (!dashboard.success) return { success: false, error: dashboard.error }

  return {
    success: true,
    data: {
      ...dashboard.data,
      schedule
    }
  }
}
