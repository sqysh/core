import { redirect } from 'next/navigation'
import { auth } from '@/app/lib/auth'
import { getAdminDashboardData } from '@/app/lib/actions/dashboard/getAdminDashboardData'
import AdminDashboardClient from './AdminDashboardClient'

export default async function AdminDashPage() {
  const session = await auth()
  if (session.user.role !== 'ADMIN') redirect('/dashboard')

  const result = await getAdminDashboardData()

  if (!result.success || !result.data) {
    return (
      <div className="min-h-screen bg-bg-light dark:bg-bg-dark flex items-center justify-center px-4">
        <p className="font-nunito text-sm text-muted-light dark:text-muted-dark text-center">
          Unable to load dashboard. Please refresh.
        </p>
      </div>
    )
  }

  return <AdminDashboardClient data={result.data} />
}
