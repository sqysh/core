'use client'

import { useEffect, useMemo, useState } from 'react'
import { MeshBasicMaterial } from 'three'
import { buildAsset } from './core/cache'
import { placeOnGround } from './core/placement'
import { TerrainSampler } from './core/terrain'
import { AssetBuild, AssetRecipe, Level } from './core/types'

// Placing environment assets. useAssetBuild builds (or reuses) a recipe's variation at a level of detail; the
// EnvironmentAsset component sets a finished build into the terrain by its own anchor. The same pieces place assets in
// the workshop now and in the world later.

/** A recipe's variation at a level of detail, once it has built (null until then); `building` while it works */
export function useAssetBuild(recipe: AssetRecipe | null, seed: number, level: Level) {
  const [state, setState] = useState<{ key: string; build: AssetBuild | null }>({ key: '', build: null })
  const key = recipe?.build && (level !== 'original' || recipe.original) ? `${recipe.id}:${seed}:${level}` : ''
  useEffect(() => {
    if (!key || !recipe) return
    let live = true
    // let the page paint first: a new variation's source mesh takes a moment to model
    const t = window.setTimeout(() => {
      buildAsset(recipe, seed, level).then(
        (build) => {
          if (live) setState({ key, build })
        },
        (error) => {
          console.error(`Couldn't build ${key}`, error)
          if (live) setState({ key, build: null })
        }
      )
    }, 30)
    return () => {
      live = false
      window.clearTimeout(t)
    }
  }, [recipe, seed, level, key])
  const current = state.key === key ? state.build : null
  return { build: current ?? (key ? state.build : null), building: Boolean(key) && state.key !== key }
}

const wire = new MeshBasicMaterial({ color: '#7fd3ff', wireframe: true, transparent: true, opacity: 0.35, depthWrite: false })

export function EnvironmentAsset({
  build,
  terrain,
  x = 0,
  z = 0,
  yaw = 0,
  wireframe = false
}: {
  build: AssetBuild
  terrain: TerrainSampler
  x?: number
  z?: number
  yaw?: number
  wireframe?: boolean
}) {
  const at = useMemo(() => placeOnGround(terrain, build.anchor, x, z, yaw), [terrain, build, x, z, yaw])
  return (
    <group position={at.position} quaternion={at.quaternion}>
      {build.parts.map((p, i) => (
        <group key={i}>
          <mesh geometry={p.geometry} material={p.material} castShadow={p.castShadow} receiveShadow={p.receiveShadow} />
          {wireframe && <mesh geometry={p.geometry} material={wire} />}
        </group>
      ))}
    </group>
  )
}
