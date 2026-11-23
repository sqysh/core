'use client'

import { useMemo } from 'react'
import { CoastalTile } from '@/app/dev/lighthouse/_components/CoastalTile'
import { beachHeight, ShoreField } from '@/app/dev/lighthouse/_lib/shore'
import { fbm3 } from '@/lib/environment/core/noise'
import { samplerFrom } from '@/lib/environment/core/terrain'

// The workshop's diorama: one of the world's own coastal tiles (its sand, its sea and the glass sides that cut the
// water away), with an island shaped to hold an asset at its centre and let its seaward edge (+z) run into the water.
// Assets are grounded on exactly the sand the tile draws.

/** A rounded island a little longer than it is deep, set well back from the sea side (so a shoreline asset's seaward
 *  edge stands out in the shallows), its outline wandering softly */
const islandShore: ShoreField = (x, z) => {
  const cx = x / 4.2
  const cz = (z + 1.75) / 2.7
  const r = Math.pow(Math.pow(Math.abs(cx), 4) + Math.pow(Math.abs(cz), 4), 0.25)
  const a = Math.atan2(cz, cx)
  const wobble = 0.05 * Math.sin(a * 3 + 0.8) + 0.035 * Math.sin(a * 5 + 2) + 0.05 * fbm3(x * 0.5, 0, z * 0.5, 31, 3)
  return (r - 1 - wobble) * 3.2
}

export const dioramaTerrain = samplerFrom((x, z) => beachHeight(islandShore, x, z), 0)

export function DioramaGround() {
  const shore = useMemo(() => islandShore, [])
  return <CoastalTile shore={shore} />
}
