'use client'

import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { Color } from 'three'
import { LighthouseTile } from '../../lighthouse/_components/LighthouseTile'
import { TileSides } from '../../lighthouse/_lib/world'
import { coastShore } from '../_lib/coast'
import { Details } from './Details'
import { HarborWater } from './HarborWater'
import { Landscape } from './Landscape'
import { QrTrailSign } from './QrSign'
import { Vines } from './Vines'

// The meeting harbor's world: the original lighthouse diorama island (rock shelves, beach, rowboat, cypresses,
// string lights, clouds and gulls, all as modelled) as the tip of a peninsula, the coast around it built from the
// same pieces, and the see-through sea all round — open on the right and below for the fleet. No sky, no horizon.

/** Deep-sea colour: the background only ever shows past the far edge of the water */
export const SEA = '#1a8ea3'
const OPEN: TileSides = { north: false, south: false, east: false, west: false }

export function HarborWorld({ checkInUrl }: { checkInUrl: string }) {
  const scene = useThree((s) => s.scene)
  useEffect(() => {
    scene.background = new Color(SEA)
    scene.fog = null
    return () => {
      scene.background = null
    }
  }, [scene])

  return (
    <>
      {/* the island's beach follows the whole coast, so it runs straight into the neck; the sea is drawn below */}
      <LighthouseTile sides={OPEN} shore={coastShore} water={false} crossPost={false} clouds={false} solidRowboat />
      <Landscape />
      <Details />
      <Vines />
      <QrTrailSign url={checkInUrl} />
      <HarborWater />
    </>
  )
}
