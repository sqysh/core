import type { Metadata } from 'next'
import { auth } from '@/lib/auth/auth'
import { getMyVessel } from '@/lib/actions/vessel/getMyVessel'
import { defaultVesselConfig, FREE_COSMETICS } from '@/lib/vessel/catalog'
import GarageClient from './GarageClient'

export const metadata: Metadata = { title: 'Boat Garage' }
export const dynamic = 'force-dynamic'

// The member's boat as saved on their account (or the default their id gives them), and what they've unlocked. If the
// vessel tables aren't there yet, the Garage still opens on their default, with saving switched off.
export default async function GaragePage() {
  const session = await auth()
  const userId = session!.user.id
  const res = await getMyVessel()

  return (
    <GarageClient
      initial={res.success ? res.data.config : defaultVesselConfig(userId)}
      unlocked={res.success ? res.data.unlocked : FREE_COSMETICS}
      storageReady={res.success}
      firstName={(session!.user.name ?? '').split(' ')[0] || 'Navigator'}
    />
  )
}
