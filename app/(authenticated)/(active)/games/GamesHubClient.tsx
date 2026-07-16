'use client'

import { WheelState } from '@/types/_wheel.types'
import { LobbyMember, SerializedGame } from '@/types/game.types'
import { Centered, PhoneShell } from '../../../components/game/shared/Shell'
import WheelTVClient from '../../../components/game/wheel/WheelTVClient'
import WheelPhoneClient from '../../../components/game/wheel/WheelPhoneClient'

// The hub. Reads game.type and the surface (tv|phone) and renders the matching
// per-game client. This is the ONLY place that knows about specific game
// components — adding a game means adding a case here (plus its leaf folder and
// a registry entry). The spine doesn't change.
//
// When there's no active game on the phone surface, members see a waiting state;
// on the TV surface the host still gets the wheel lobby so they can start one.
// (When you add more game types, the TV "start" screen becomes a type picker.)

interface Props {
  surface: 'tv' | 'phone'
  userId: string
  initialGame: SerializedGame | null
  initialLobby: LobbyMember[]
}

export default function GamesHubClient({ surface, userId, initialGame, initialLobby }: Props) {
  // No game yet:
  //  - TV: render the wheel TV client so the host can start one (defaults to wheel).
  //  - Phone: show a waiting state.
  const type = initialGame?.type ?? 'WHEEL'

  if (surface === 'phone' && !initialGame) {
    return (
      <PhoneShell>
        <Centered>
          <p className="font-quicksand font-black text-xl mb-2">Game time</p>
          <p className="font-nunito text-white/60 text-sm">
            No game running yet. When the host starts one, it’ll show up here.
          </p>
        </Centered>
      </PhoneShell>
    )
  }

  switch (type) {
    case 'WHEEL':
      return surface === 'tv' ? (
        <WheelTVClient initialGame={initialGame as SerializedGame<WheelState> | null} initialLobby={initialLobby} />
      ) : (
        <WheelPhoneClient userId={userId} initialGame={initialGame as SerializedGame<WheelState> | null} />
      )

    default:
      return (
        <PhoneShell>
          <Centered>
            <p className="font-nunito text-white/60 text-sm">Unknown game type. Update the hub to handle “{type}”.</p>
          </Centered>
        </PhoneShell>
      )
  }
}
