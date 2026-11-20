import { vesselConfigSchema } from '@/lib/schemas/vessel.schema'
import { defaultVesselConfig, VesselConfig } from '@/lib/vessel/catalog'

// Reading saved vessels back out of the database. A stored row is re-checked against today's catalog, so a row that no
// longer fits (an id retired from the catalog, a hand-edited value) falls back to the member's default boat instead of
// breaking the scene.

export const VESSEL_SELECT = {
  userId: true,
  vesselClass: true,
  hullColor: true,
  trimColor: true,
  accentColor: true,
  sailColor: true,
  sailPattern: true,
  accessories: true,
  details: true
} as const

export type VesselRow = {
  userId: string
  vesselClass: string
  hullColor: string
  trimColor: string
  accentColor: string
  sailColor: string
  sailPattern: string
  accessories: string[]
  details: unknown
}

export function vesselFromRow(row: VesselRow): VesselConfig {
  const { userId, ...config } = row
  const parsed = vesselConfigSchema.safeParse({ ...config, details: config.details ?? {} })
  return parsed.success ? (parsed.data as VesselConfig) : defaultVesselConfig(userId)
}
