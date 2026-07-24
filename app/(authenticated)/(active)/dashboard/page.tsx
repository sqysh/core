import { redirect } from 'next/navigation'
import { auth } from '@/app/lib/auth'
import DashboardClient from '@/app/(authenticated)/(active)/dashboard/DashboardClient'
import { getDashboardPageData } from '@/app/lib/actions/dashboard/getDashboardPageData'

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const result = await getDashboardPageData()

  if (!result.success || !result.data) {
    return <DashboardError />
  }

  return <DashboardClient {...result.data} />
}

function DashboardError() {
  return (
    <div className="min-h-screen bg-bg-light dark:bg-bg-dark flex items-center justify-center px-4">
      <p className="font-nunito text-sm text-muted-light dark:text-muted-dark text-center">
        Unable to load your dashboard. Please refresh.
      </p>
    </div>
  )
}
