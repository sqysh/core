'use client'

import { Canvas } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import { NeutralToneMapping, PCFShadowMap } from 'three'
import { getPusherClient, releaseChannel } from '@/lib/pusher/pusherClient'
import { FollowCamera, type Frame } from './_components/FollowCamera'
import { HarborStage } from './_components/HarborStage'
import { berthBoat, createLaunches } from './_lib/fleetOps'
import { identities, refreshIdentity } from './_lib/identity'
import type { HarborData } from './_lib/loadHarbor'
import { createStore } from './_lib/store'
import { VIEW } from './_lib/view'

// A member's phone's small copy of the TV harbor, following their own boat. Everyone already in today lies at anchor
// in arrival order (so berths match the TV), the member's own boat sails in once `go` is set (when they've turned
// their phone), and everyone who checks in after them sails in live, as on the TV.
//
// Lighter than the TV: no post-processing, a smaller shadow map and resolution, the same world and fleet.

type Props = HarborData & {
  /** The member whose boat this is */
  me: string
  /** Sail their boat in (a fresh check-in) rather than finding it already at anchor */
  sailMe: boolean
  /** Their boat may set off now */
  go: boolean
  /** Where their boat sits on screen, when controls cover part of it */
  frame?: Frame
  onReady?: () => void
}

export default function PhoneHarbor({ members, initialAttendees, vessels, me, sailMe, go, frame, onReady }: Props) {
  const who = useMemo(() => identities(members, vessels), [members, vessels])
  const store = useMemo(() => createStore(), [])
  const launches = useRef(createLaunches())
  const [ids, setIds] = useState<string[]>([])
  const [built, setBuilt] = useState(false)

  const add = (id: string, sail: boolean) => {
    const identity = who.get(id)
    if (identity && berthBoat(store, identity, sail, launches.current)) setIds((prev) => [...prev, id])
  }

  // everyone already in, in the order they arrived; their own boat too if it isn't sailing in
  useEffect(() => {
    for (const id of initialAttendees) if (id !== me || !sailMe) add(id, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // their own arrival, once they're watching
  useEffect(() => {
    if (go && sailMe) add(me, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [go])

  // everyone who checks in after them; waits for the build, which blocks the page (a socket opened during it times out)
  useEffect(() => {
    if (!built) return
    const channel = getPusherClient().subscribe('meeting-attendance')
    const onCheckIn = (data: { userId: string; vessel?: unknown }) => {
      if (data.userId === me) return
      refreshIdentity(who, data.userId, data.vessel)
      add(data.userId, true)
    }
    channel.bind('check-in', onCheckIn)
    return () => {
      channel.unbind('check-in', onCheckIn)
      releaseChannel('meeting-attendance')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [built])

  return (
    <Canvas
      orthographic
      shadows={{ type: PCFShadowMap }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, stencil: false }}
      camera={{ zoom: VIEW.zoom, near: 0.5, far: 500, position: [VIEW.target.x + 80, 80, VIEW.target.z + 80] }}
      // the TV's finish without its post-processing: the same neutral tone mapping
      onCreated={({ gl }) => {
        gl.toneMapping = NeutralToneMapping
      }}
    >
      <HarborStage
        store={store}
        ids={ids}
        shadowMapSize={1024}
        onReady={() => {
          setBuilt(true)
          onReady?.()
        }}
      />
      <FollowCamera store={store} follow={me} frame={frame} />
    </Canvas>
  )
}
