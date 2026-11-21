import z from 'zod'
import { ACCESSORIES, FINISHES, SAIL_PATTERNS, STAGE_IDS, StageId, VESSEL_CLASSES } from '@/lib/vessel/catalog'
import { ItemId, PART_IDS } from '@/lib/vessel/items'

const colour = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Pick a colour')
  .transform((s) => s.toLowerCase())

/**
 * A vessel configuration's shape. Whether its parts fit together (items.ts) and whether the member owns them (the
 * database) are checked by the save action; reading a stored boat back takes off anything that no longer fits.
 */
export const vesselConfigSchema = z.strictObject({
  vesselClass: z.enum(VESSEL_CLASSES),
  hullColor: colour,
  trimColor: colour,
  accentColor: colour,
  sailColor: colour,
  sailPattern: z.enum(SAIL_PATTERNS),
  // the heritage classes' flags: a generous cap against junk, then repeats dropped
  accessories: z
    .array(z.enum(ACCESSORIES))
    .max(64)
    .transform((list) => [...new Set(list)]),
  details: z
    .strictObject({
      cabinColor: colour.optional(),
      roofColor: colour.optional(),
      bottomColor: colour.optional(),
      seatsColor: colour.optional(),
      deckColor: colour.optional(),
      equipmentColor: colour.optional(),
      finish: z.enum(FINISHES).optional(),
      // the modular boat's vessel level, and its accessories: every one a known part, each once
      stage: z.enum(STAGE_IDS as [StageId, ...StageId[]]).optional(),
      parts: z
        .array(z.enum(PART_IDS as [ItemId, ...ItemId[]]))
        .max(120)
        .transform((list) => [...new Set(list)])
        .optional()
    })
    .default({})
})
