import { getUsers } from '@/lib/actions/user/getUsers'
import AttendanceClient from './AttendanceClient'
import { getTodayAttendance } from '@/lib/actions/meeting/getTodayAttendance'

export const dynamic = 'force-dynamic'

export default async function AttendancePage() {
  const result = await getUsers()
  const attendees = await getTodayAttendance()
  return <AttendanceClient members={result.data} initialAttendees={attendees} />
}
