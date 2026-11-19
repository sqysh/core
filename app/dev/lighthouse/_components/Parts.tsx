'use client'

import { useMemo } from 'react'
import { archWindow } from '../_lib/geometry'
import { materials } from '../_lib/materials'

// Small architectural parts shared by every building in the world.

/** Something mounted flat against a round wall, facing out at angle `a` (0 = +z) */
export function OnWall({ a, y, r, children }: { a: number; y: number; r: number; children: React.ReactNode }) {
  return (
    <group position={[Math.sin(a) * r, y, Math.cos(a) * r]} rotation={[0, a, 0]}>
      {children}
    </group>
  )
}

export function ArchedWindow({
  w,
  h,
  glow = false,
  dark = false
}: {
  w: number
  h: number
  glow?: boolean
  /** timber frame instead of painted trim */
  dark?: boolean
}) {
  const m = materials()
  const frame = dark ? m.timber : m.trim
  const { frameGeo, glassGeo } = useMemo(() => archWindow(w, h, 0.055, 0.06), [w, h])
  return (
    <group>
      <mesh geometry={frameGeo} material={frame} castShadow />
      <mesh geometry={glassGeo} material={glow ? m.lantern : m.glass} position={[0, 0, 0.005]} />
      <mesh material={frame} position={[0, h / 2 - 0.03, 0.03]}>
        <boxGeometry args={[0.022, h - 0.04, 0.03]} />
      </mesh>
      <mesh material={frame} position={[0, h * 0.42, 0.03]}>
        <boxGeometry args={[w, 0.022, 0.03]} />
      </mesh>
      {/* sill */}
      <mesh material={frame} position={[0, -0.05, 0.05]} castShadow>
        <boxGeometry args={[w + 0.18, 0.05, 0.1]} />
      </mesh>
    </group>
  )
}

