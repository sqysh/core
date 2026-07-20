// Pure helper shared by all team-based games. Shuffles members, splits into two
// teams, Team A guesses first.

import type { LobbyMember, Team } from '@/types/game.types'

export interface DraftedPlayer {
  userId: string
  name: string
  team: Team
  turnOrder: number
}

interface Guest {
  name: string
}

interface NewPlayer {
  userId: string
  name: string
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function draftTeams(members: LobbyMember[], guests: Guest[]): DraftedPlayer[] {
  // build visitors object
  const newPlayers: NewPlayer[] = guests.map((v, i) => ({ userId: `GUEST-${v.name}-${i}`, name: v.name }))

  const combinedPlayers = [...newPlayers, ...members]

  const shuffled = shuffle(combinedPlayers)
  const mid = Math.ceil(shuffled.length / 2) // odd count → Team A gets the extra

  const teamA = shuffled.slice(0, mid)
  const teamB = shuffled.slice(mid)

  const players: DraftedPlayer[] = []
  const max = Math.max(teamA.length, teamB.length)
  let order = 0
  for (let i = 0; i < max; i++) {
    if (teamA[i]) players.push({ userId: teamA[i].userId, name: teamA[i].name, team: 'A', turnOrder: order++ })
    if (teamB[i]) players.push({ userId: teamB[i].userId, name: teamB[i].name, team: 'B', turnOrder: order++ })
  }
  return players
}
