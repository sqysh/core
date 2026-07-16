// The hub entry point. Server component. Loads the active game (any type) plus
// today's lobby, and the viewer's id, then hands to the hub client which picks
// the right per-game view.
//
// Surface (tv vs phone) is chosen by ?view=tv|phone, defaulting to phone. Point
// the meeting TV at /games?view=tv and link members to /games from the dashboard.

import { redirect } from 'next/navigation'
import { auth } from '@/app/lib/auth'
import { getActiveGame } from '../../../lib/actions/games/getActiveGame'
import { getLobby } from '../../../lib/actions/games/getLobby'
import GamesHubClient from './GamesHubClient'

export const dynamic = 'force-dynamic'

export default async function GamesPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const { view } = await searchParams
  const surface = view === 'tv' ? 'tv' : 'phone'

  // TV surface is host-only.
  if (surface === 'tv' && session.user.role !== 'SUPER_USER' && session.user.role !== 'ADMIN') {
    redirect('/games')
  }

  const [gameRes, lobbyRes] = await Promise.all([
    getActiveGame(),
    surface === 'tv' ? getLobby() : Promise.resolve({ success: true as const, data: [] })
  ])

  return (
    <GamesHubClient
      surface={surface}
      userId={session.user.id}
      initialGame={gameRes.success ? gameRes.data : null}
      initialLobby={lobbyRes.success ? lobbyRes.data : []}
    />
  )
}
