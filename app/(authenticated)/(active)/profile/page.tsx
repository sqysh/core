import { getProfile } from '@/app/lib/actions/user/getProfile'
import ProfileClient from './ProfileClient'

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const result = await getProfile()

  if (!result.success || !result.data) {
    return (
      <div className="min-h-screen bg-bg-light dark:bg-bg-dark flex items-center justify-center px-4">
        <p className="font-nunito text-sm text-muted-light dark:text-muted-dark text-center">
          Unable to load your profile. Please refresh.
        </p>
      </div>
    )
  }

  return <ProfileClient profile={result.data} />
}
