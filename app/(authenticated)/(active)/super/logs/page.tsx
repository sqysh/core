import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/auth'
import SuperLogsClient from '@/app/(authenticated)/(active)/super/logs/SuperLogsClient'
import { getLogs } from '@/lib/actions/log/getLogs'

export default async function LogsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (session.user.role !== 'SUPER_USER') redirect('/dashboard')

  const result = await getLogs({ page: 1 })

  if (!result.success || !result.data) {
    return (
      <div className="min-h-screen bg-bg-light dark:bg-bg-dark flex items-center justify-center px-4">
        <p className="font-nunito text-sm text-muted-light dark:text-muted-dark text-center">
          Unable to load logs. Please refresh.
        </p>
      </div>
    )
  }

  return <SuperLogsClient initialByLevel={result.data.byLevel} />
}
