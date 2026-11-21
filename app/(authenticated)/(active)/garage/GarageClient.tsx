'use client'

import { GarageProvider } from './_hooks/GarageContext'
import { useEdgeBackground } from './_hooks/useEdgeBackground'
import { GarageProps, useGarage } from './_hooks/useGarage'
import { GarageHeader } from './_components/GarageHeader'
import { GaragePanel } from './_components/GaragePanel'
import { GarageScene } from './_components/GarageScene'

// The Navigator's Boat Garage: your own boat afloat on the harbor's water, and a Liquid Glass menu to grow and dress
// it. Everyone starts with the same small skiff. Shipyard credits, earned from what a member does for CORE, go wherever
// they choose: Upgrade Vessel rebuilds the boat at the next level (a longer hull, more deck, more structure, more
// levels; from the Center Console the paths divide into motor and sail), or Customize buys accessories the boat's level
// has unlocked, from a tackle box to a hot tub or a water slide, each fitted where the deck has room. Every purchase is
// checked on the server (buyVesselItem, saveMyVessel); the preview is the very model the TV's harbor sails.
//
// The state lives in useGarage and is shared through GarageProvider; the scene, header and menu read it from there.

export type { Section } from './_lib/garage'

export default function GarageClient(props: GarageProps) {
  const garage = useGarage(props)
  useEdgeBackground()

  return (
    <GarageProvider value={garage}>
      <div className="fixed inset-0 overflow-hidden bg-[#1a8ea3] text-white">
        <GarageScene />
        <GarageHeader />
        <GaragePanel />
      </div>
    </GarageProvider>
  )
}
