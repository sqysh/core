import type { Metadata, Viewport } from 'next'
import { auth } from '@/lib/auth/auth'
import { getMyVessel } from '@/lib/actions/vessel/getMyVessel'
import { defaultVesselConfig } from '@/lib/vessel/catalog'
import { FREE_ITEMS, NO_STATS } from '@/lib/vessel/items'
import GarageClient from './GarageClient'

export const metadata: Metadata = { title: 'Boat Garage' }
// the harbor runs edge to edge: into the notch and home-indicator areas too (the controls keep to the safe areas)
export const viewport: Viewport = { viewportFit: 'cover', themeColor: '#1a8ea3' }
export const dynamic = 'force-dynamic'

// The member's boat as saved on their account (or the starter boat), what they own, what they've done and their credits. If the
// vessel tables aren't there yet, the Garage still opens on their default, with saving switched off.
export default async function GaragePage() {
  const session = await auth()
  const userId = session!.user.id
  const res = await getMyVessel()

  return (
    <GarageClient
      initial={res.success ? res.data.config : defaultVesselConfig(userId)}
      unlocked={res.success ? res.data.unlocked : FREE_ITEMS}
      stats={res.success ? res.data.stats : NO_STATS}
      credits={res.success ? res.data.credits : { earned: 0, spent: 0, balance: 0 }}
      storageReady={res.success}
      firstName={(session!.user.name ?? '').split(' ')[0] || 'Navigator'}
    />
  )
}
