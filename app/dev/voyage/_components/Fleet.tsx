'use client'

import { useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { Group } from 'three'
import { angleDelta, CRUISE, damp, FleetState, FLEET, START_S, waterHeight } from '../_lib/fleet'
import { routeAt } from '../_lib/route'
import { BoatModel } from './BoatModels'
import { Wakes } from './Wakes'

// Sails the fleet along the route: the lead boat eases up to cruising speed, slows for bends, glides to a stop when
// paused; every boat follows at its spacing in its own lane, turning, leaning, pitching and riding the swell.

export function Fleet({
  state,
  playing,
  resetKey,
  seek = 0
}: {
  state: FleetState
  playing: boolean
  resetKey: number
  /** Start this many route units into the voyage, already under way (development) */
  seek?: number
}) {
  const outer = useRef<(Group | null)[]>([])
  const inner = useRef<(Group | null)[]>([])
  const placed = useRef(false)

  // reset: back to the start, dead in the water, facing along the route
  useEffect(() => {
    state.s = START_S + seek
    state.speed = seek > 0 ? CRUISE : 0
    placed.current = false
    // a seek only applies to the first start; Reset always goes back to the beginning
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey, state])

  useFrame(({ clock }, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const t = clock.elapsedTime

    // speed: ease toward cruise, but take bends gently; a stop is a long glide
    const ahead = routeAt(state.s + 1.2)
    const target = playing ? CRUISE / (1 + 1.4 * ahead.curvature) : 0
    state.speed += (target - state.speed) * damp(target > state.speed ? 0.5 : 0.65, dt)
    if (!playing && state.speed < 0.003) state.speed = 0
    state.s += state.speed * dt
    const speedNorm = state.speed / CRUISE

    FLEET.forEach((spec, i) => {
      const b = state.boats[i]
      const r = routeAt(state.s - spec.gap)
      // lane offset to starboard of the route
      const x = r.x - r.tz * spec.lane
      const z = r.z + r.tx * spec.lane
      const heading = Math.atan2(r.tx, r.tz)
      if (!placed.current) {
        b.heading = heading
        b.turnRate = 0
      }
      const turn = angleDelta(b.heading, heading)
      const newHeading = placed.current ? b.heading + turn * damp(4, dt) : heading
      b.turnRate += ((newHeading - b.heading) / Math.max(dt, 1e-4) - b.turnRate) * damp(3, dt)
      b.heading = newHeading
      b.x = x
      b.z = z

      // lean into turns, lift the bow with speed, and rock on the swell (more when idling)
      const idle = 1 - Math.min(1, speedNorm * 1.5)
      const rock = Math.sin(t * 1.25 + spec.phase) * (0.02 + 0.025 * idle)
      const heel = spec.kind === 'sail' ? 0.07 * speedNorm : 0
      const rollTarget = -b.turnRate * speedNorm * 0.35 * spec.lean - heel + rock
      b.roll += (rollTarget - b.roll) * damp(3, dt)
      const pitchTarget = spec.planing * speedNorm + Math.sin(t * 1.6 + spec.phase * 2) * (0.012 + 0.014 * idle)
      b.pitch += (pitchTarget - b.pitch) * damp(2.5, dt)
      b.y = waterHeight(x, z, t) + Math.sin(t * 1.4 + spec.phase) * 0.018 - spec.planing * speedNorm * 0.4

      const o = outer.current[i]
      const n = inner.current[i]
      if (o) {
        o.position.set(b.x, b.y, b.z)
        // models point their bow along +x
        o.rotation.set(0, b.heading - Math.PI / 2, 0)
      }
      if (n) n.rotation.set(b.roll, 0, b.pitch)
    })
    placed.current = true
  })

  return (
    <group>
      {FLEET.map((spec, i) => (
        <group
          key={spec.kind}
          ref={(el) => {
            outer.current[i] = el
          }}
        >
          <group
            ref={(el) => {
              inner.current[i] = el
            }}
          >
            <BoatModel kind={spec.kind} />
          </group>
        </group>
      ))}
      <Wakes state={state} resetKey={resetKey} />
    </group>
  )
}
