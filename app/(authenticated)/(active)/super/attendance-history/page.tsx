import { redirect } from 'next/navigation'
import { auth } from '@/app/lib/auth'
import { getAttendanceHistory } from '@/app/lib/actions/attendance/getAttendanceHistory'
import AttendanceHistoryClient from './AttendanceHistoryClient'

export default async function AttendanceHistoryPage() {
  const session = await auth()
  if (session?.user?.role !== 'SUPER_USER') redirect('/dashboard')

  const result = await getAttendanceHistory()

  if (!result.success || !result.data) {
    return (
      <div className="min-h-screen bg-bg-light dark:bg-bg-dark flex items-center justify-center">
        <p className="text-sm font-nunito text-muted-light dark:text-muted-dark">Failed to load attendance history.</p>
      </div>
    )
  }

  return <AttendanceHistoryClient members={result.data.members} rows={result.data.rows} />
}
