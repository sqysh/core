'use client'

import { useFrame, useThree } from '@react-three/fiber'
import { useRef } from 'react'
import { Vector3 } from 'three'
import { damp } from '../_lib/damp'
import { HarborStore } from '../_lib/store'

// Keeps every nameplate (plain DOM, sized for across-the-room reading) pinned above its boat: projects the boat's
// masthead to the screen each frame, stacks plates that would collide, and eases them so they never jitter. A thin
// line ties each plate down to its boat.

const GAP = 14
const PAD = 8

type Placed = { id: string; ax: number; ay: number; w: number; h: number; top: number; opacity: number }

/** The plates are plain DOM nodes owned by the store, styled straight from the frame loop */
function hide(el: HTMLElement) {
  el.style.opacity = '0'
}

function showPlate(el: HTMLElement, p: Placed, top: number) {
  el.style.opacity = p.opacity.toFixed(3)
  el.style.transform = `translate3d(${(p.ax - p.w / 2).toFixed(1)}px, ${top.toFixed(1)}px, 0)`
  const line = el.querySelector<HTMLElement>('[data-line]')
  if (line) line.style.height = `${Math.max(0, p.ay - (top + p.h)).toFixed(1)}px`
}

export function PlateTracker({ store }: { store: HarborStore }) {
  const size = useThree((s) => s.size)
  const v = useRef(new Vector3())
  const tops = useRef(new Map<string, number>())
  const dims = useRef(new WeakMap<HTMLElement, { w: number; h: number }>())

  useFrame(({ camera }, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const list: Placed[] = []
    for (const [id, el] of store.plates) {
      const b = store.boats.get(id)
      if (!b || b.phase === 'waiting') {
        hide(el)
        continue
      }
      v.current.set(b.x, b.y + b.who.spec.dims.top + 0.12, b.z)
      v.current.project(camera)
      if (v.current.z > 1) {
        hide(el)
        continue
      }
      let d = dims.current.get(el)
      if (!d || d.w === 0) {
        d = { w: el.offsetWidth, h: el.offsetHeight }
        dims.current.set(el, d)
      }
      const ax = (v.current.x * 0.5 + 0.5) * size.width
      const ay = (-v.current.y * 0.5 + 0.5) * size.height
      list.push({ id, ax, ay, w: d.w, h: d.h, top: ay - GAP - d.h, opacity: 1 })
    }

    // nearest boats (lowest on screen) keep their spot; plates behind them step up out of the way
    list.sort((a, b) => b.ay - a.ay)
    const placed: Placed[] = []
    for (const p of list) {
      for (let pass = 0; pass < 12; pass++) {
        let moved = false
        for (const o of placed) {
          const overlapX = Math.abs(p.ax - o.ax) < (p.w + o.w) / 2 + PAD
          const overlapY = p.top < o.top + o.h + PAD && p.top + p.h + PAD > o.top
          if (overlapX && overlapY) {
            p.top = o.top - p.h - PAD
            moved = true
          }
        }
        if (!moved) break
      }
      placed.push(p)
    }

    for (const p of placed) {
      const el = store.plates.get(p.id)!
      const prev = tops.current.get(p.id)
      const top = prev === undefined ? p.top : prev + (p.top - prev) * damp(7, dt)
      tops.current.set(p.id, top)
      showPlate(el, p, top)
    }
  })
  return null
}
