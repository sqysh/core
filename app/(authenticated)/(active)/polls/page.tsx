import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/auth'
import { PollsClient } from './PollsClient'
import { getPolls } from '@/lib/actions/poll/getPolls'

export const dynamic = 'force-dynamic'

export default async function PollsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login?callbackUrl=%2Fpolls')
  const res = await getPolls()
  return <PollsClient polls={res.success ? res.data : []} me={session.user.id} />
}
