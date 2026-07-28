'use client'

// Two columns, Team A and Team B, listing players in turn order. The player
// whose turn it is gets a highlighted "ON THE CLOCK" marker. Scores sit at the
// top of each column.

import { motion } from 'framer-motion'
import type { SerializedPlayer, Team } from '@/types/game.types'

interface TeamRosterProps {
  players: SerializedPlayer[]
  scoreA: number
  scoreB: number
  activeUserId: string | null
}

const TEAM_META: Record<Team, { label: string; color: string }> = {
  A: { label: 'TEAM A', color: '#3DDC97' },
  B: { label: 'TEAM B', color: '#FF6B6B' }
}

function Column({
  team,
  players,
  score,
  activeUserId
}: {
  team: Team
  players: SerializedPlayer[]
  score: number
  activeUserId: string | null
}) {
  const meta = TEAM_META[team]
  const roster = players.filter((p) => p.team === team)
  return (
    <div className="flex-1">
      <div className="flex items-center justify-between border-b pb-2 mb-3" style={{ borderColor: meta.color }}>
        <span className="font-mono text-[10px] tracking-[0.2em] uppercase" style={{ color: meta.color }}>
          {meta.label}
        </span>
        <span className="font-quicksand font-black text-2xl text-white">{score}</span>
      </div>
      <ul className="space-y-1.5">
        {roster.map((p) => {
          const active = p.userId === activeUserId
          return (
            <li key={p.id}>
              <motion.div
                animate={{
                  backgroundColor: active ? `${meta.color}22` : 'rgba(255,255,255,0)'
                }}
                className="flex items-center gap-2 px-3 py-2 border"
                style={{ borderColor: active ? meta.color : 'rgba(255,255,255,0.08)' }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: active ? meta.color : 'rgba(255,255,255,0.2)' }}
                />
                <span className={`font-nunito text-sm ${active ? 'text-white font-bold' : 'text-white/70'}`}>
                  {p.name}
                </span>
                {active && (
                  <span
                    className="ml-auto font-mono text-[8px] tracking-[0.18em] uppercase px-2 py-0.5"
                    style={{ backgroundColor: meta.color, color: '#06121b' }}
                  >
                    On the clock
                  </span>
                )}
              </motion.div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default function TeamRoster({ players, scoreA, scoreB, activeUserId }: TeamRosterProps) {
  return (
    <div className="flex gap-6">
      <Column team="A" players={players} score={scoreA} activeUserId={activeUserId} />
      <Column team="B" players={players} score={scoreB} activeUserId={activeUserId} />
    </div>
  )
}
