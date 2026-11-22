import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/auth'
import { LaunchScreen } from './LaunchScreen'

export const dynamic = 'force-dynamic'

/** The native app's entry: members who are already signed in go straight to their dashboard (same homes as /login) */
export default async function LaunchPage() {
  const session = await auth()
  if (session?.user) redirect(session.user.role === 'SUPER_USER' ? '/super/dashboard' : '/dashboard')
  return <LaunchScreen />
}
