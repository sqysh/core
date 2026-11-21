import { vesselConfigSchema } from '@/lib/schemas/vessel.schema'
import { defaultVesselConfig, VesselConfig } from '@/lib/vessel/catalog'
import { settle } from '@/lib/vessel/items'

// Reading saved vessels back out of the database. A stored row is re-checked against today's catalog: anything on it
// that no longer fits comes off (the rest of the boat is kept), and a row that can't be read at all (a hand-edited
// value) falls back to the member's default boat instead of breaking the scene.

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

/** A stored or sent boat, made safe to draw; null when it isn't a boat at all */
export function readVessel(input: unknown): VesselConfig | null {
  const parsed = vesselConfigSchema.safeParse(input)
  return parsed.success ? settle(parsed.data as VesselConfig).config : null
}

export function vesselFromRow(row: VesselRow): VesselConfig {
  const { userId, ...config } = row
  return readVessel({ ...config, details: config.details ?? {} }) ?? defaultVesselConfig(userId)
}
