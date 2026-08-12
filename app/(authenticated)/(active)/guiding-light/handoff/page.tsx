import { auth } from '@/lib/auth/auth'
import { redirect } from 'next/navigation'
import HandoffClient from './HandoffClient'

export default async function HandoffPage({ searchParams }: { searchParams: Promise<{ winner?: string }> }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const { winner } = await searchParams

  if (!winner) redirect('/dashboard')

  return <HandoffClient winnerName={decodeURIComponent(winner)} />
}
