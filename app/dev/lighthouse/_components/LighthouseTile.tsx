'use client'

import { lighthouseShore, COTTAGE, LIGHTHOUSE } from '../_lib/lighthouseTile'
import { ShoreField } from '../_lib/shore'
import { ALL_SIDES, tileOrigin, TileSides } from '../_lib/world'
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
  sides = ALL_SIDES,
  shore = lighthouseShore,
  water = true,
  crossPost = true
}: {
  col?: number
  row?: number
  sides?: TileSides
  /** In a connected world, the world's shoreline seen from this tile (so foam and shallows flow across its edges) */
  shore?: ShoreField
  /** Draw the tile's own sea (off when a larger sea is drawn around it) */
  water?: boolean
  /** The cross-armed post by the rowboat */
  crossPost?: boolean
}) {
  return (
    <CoastalTile position={tileOrigin(col, row)} shore={shore} sides={sides} water={water}>
      <Terrain />
      <Lighthouse position={[LIGHTHOUSE.x, LIGHTHOUSE.y, LIGHTHOUSE.z]} />
      <Cottage position={[COTTAGE.x, COTTAGE.y, COTTAGE.z]} />
      <Vegetation />
      <Props crossPost={crossPost} />
      <Sky center={[LIGHTHOUSE.x, LIGHTHOUSE.z]} />
    </CoastalTile>
  )
}
