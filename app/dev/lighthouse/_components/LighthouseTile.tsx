'use client'

import { lighthouseShore, COTTAGE, LIGHTHOUSE } from '../_lib/lighthouseTile'
import { ALL_SIDES, tileOrigin, TileSides } from '../_lib/world'
import { CoastalTile } from './CoastalTile'
import { Cottage } from './Cottage'
import { Lighthouse } from './Lighthouse'
import { Props } from './Props'
import { Sky } from './Sky'
import { Terrain } from './Terrain'
import { Vegetation } from './Vegetation'

/** Tile (0, 0) of the coastal world: the lighthouse island */
export function LighthouseTile({ col = 0, row = 0, sides = ALL_SIDES }: { col?: number; row?: number; sides?: TileSides }) {
  return (
    <CoastalTile position={tileOrigin(col, row)} shore={lighthouseShore} sides={sides}>
      <Terrain />
      <Lighthouse position={[LIGHTHOUSE.x, LIGHTHOUSE.y, LIGHTHOUSE.z]} />
      <Cottage position={[COTTAGE.x, COTTAGE.y, COTTAGE.z]} />
      <Vegetation />
      <Props />
      <Sky center={[LIGHTHOUSE.x, LIGHTHOUSE.z]} />
    </CoastalTile>
  )
}
