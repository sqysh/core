'use client'

import { useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { HarborStore } from '../_lib/store'
import { anchorHere, releaseHelm, takeHelm } from '../_lib/vessel/helm'
import { weigh } from '../_lib/vessel/anchor'

// Development only (?drive): steer a boat from the keyboard, to exercise the player side of the vessel simulation
// before the phone controller exists. It writes the same HelmInput the phone will send.
//   T       take the helm of the next boat in the harbor (it weighs anchor first)
//   ↑ ↓     throttle ahead / astern       ← →  steer
//   Space   let go the anchor here, or weigh it if it's down
//   Esc     hand the boat back (it anchors where it is)

export function DevHelm({ store }: { store: HarborStore }) {
  const keys = useRef(new Set<string>())
  const current = useRef<string | null>(null)

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest('input, textarea')) return
      keys.current.add(e.key)
      const b = current.current ? store.boats.get(current.current) : undefined
      if (e.key === 't' || e.key === 'T') {
        if (b) releaseHelm(b)
        const ids = [...store.boats.keys()].filter((id) => ['moored', 'settling'].includes(store.boats.get(id)!.phase))
        const next = ids[(ids.indexOf(current.current ?? '') + 1) % Math.max(ids.length, 1)]
        const nb = next ? store.boats.get(next) : undefined
        current.current = nb && takeHelm(nb) ? nb.id : null
      }
      if (!b || b.control !== 'player') return
      if (e.key === ' ') {
        e.preventDefault()
        if (b.anchor.stage === 'holding') {
          weigh(b)
          b.phase = 'underway'
          b.rig.moored = false
        } else anchorHere(b)
      }
      if (e.key === 'Escape') {
        releaseHelm(b)
        current.current = null
      }
    }
    const up = (e: KeyboardEvent) => keys.current.delete(e.key)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [store])

  useFrame(() => {
    const b = current.current ? store.boats.get(current.current) : undefined
    if (!b || b.control !== 'player') return
    const k = keys.current
    b.helm.throttle = (k.has('ArrowUp') ? 1 : 0) - (k.has('ArrowDown') ? 1 : 0)
    b.helm.steer = (k.has('ArrowRight') ? 1 : 0) - (k.has('ArrowLeft') ? 1 : 0)
  })
  return null
}
