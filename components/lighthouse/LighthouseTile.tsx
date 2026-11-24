'use client'

import { lighthouseShore, COTTAGE, LIGHTHOUSE } from '../../lib/lighthouse/lighthouseTile'
import { ShoreField } from '../../lib/lighthouse/shore'
import { tileOrigin } from '../../lib/lighthouse/world'
import { CoastalTile } from './CoastalTile'
import { Cottage } from './Cottage'
import { Lighthouse } from './Lighthouse'
import { Props } from './Props'
import { Sky } from './Sky'
import { Terrain } from './Terrain'
import { Vegetation } from './Vegetation'

/** Tile (0, 0) of the coastal world: the lighthouse island */
export function LighthouseTile({
  col = 0,
  row = 0,
  shore = lighthouseShore
}: {
  col?: number
  row?: number
  /** In a connected world, the world's shoreline seen from this tile (so the beach flows across its edges) */
  shore?: ShoreField
}) {
  return (
    <CoastalTile position={tileOrigin(col, row)} shore={shore}>
      <Terrain />
      <Lighthouse position={[LIGHTHOUSE.x, LIGHTHOUSE.y, LIGHTHOUSE.z]} />
      <Cottage position={[COTTAGE.x, COTTAGE.y, COTTAGE.z]} />
      <Vegetation />
      <Props />
      <Sky center={[LIGHTHOUSE.x, LIGHTHOUSE.z]} />
    </CoastalTile>
  )
}
