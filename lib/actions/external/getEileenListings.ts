'use server'

import { createLog } from '@/lib/utils/api/createLog'

const ENDPOINT = 'https://www.jonahgroupre.com/api/public/eileen-listings'

export interface EileenListing {
  mlsNumber: string
  listPrice: number
  city: string
  status: string
  syncedAt: string
  listing: {
    mlsNumber: string
    listPrice: number
    standardStatus: string
    type: string
    images: string[]
    address: {
      streetNumber: string
      streetName: string
      streetSuffix: string | null
      unitNumber: string | null
      city: string
      state: string
      zip: string
    }
    details: {
      numBedrooms: number | null
      numBathrooms: number | null
      sqft: string | null
      propertyType: string | null
      style: string | null
    }
  }
}

type Result = { success: true; data: EileenListing[] } | { success: false; error: string }

export async function getEileenListings(): Promise<Result> {
  try {
    const response = await fetch(ENDPOINT, {
      headers: { accept: 'application/json' },
      // Synced once daily on jonahgroupre's side, so an hour of cache here
      // is plenty and keeps CORE page loads off the network.
      next: { revalidate: 3600 }
    })

    if (!response.ok) {
      await createLog('error', 'getEileenListings received non-OK response', {
        name: 'EileenListingsFetchError',
        status: response.status
      })
      return { success: false, error: 'Failed to load listings' }
    }

    const json = await response.json()

    return { success: true, data: json.listings ?? [] }
  } catch (error) {
    await createLog('error', 'getEileenListings failed', {
      name: 'EileenListingsFetchError',
      error: error instanceof Error ? error.message : String(error)
    })
    return { success: false, error: 'Failed to load listings' }
  }
}
