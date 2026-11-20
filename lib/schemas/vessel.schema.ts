import z from 'zod'
import { ACCESSORIES, ACCESSORY_FITS, SAIL_PATTERNS, VESSEL_CLASSES } from '@/lib/vessel/catalog'

const colour = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Pick a colour')
  .transform((s) => s.toLowerCase())

/** A vessel configuration as a member saves it. Unlock checks (earned cosmetics) need the database and happen in the action. */
export const vesselConfigSchema = z
  .strictObject({
    vesselClass: z.enum(VESSEL_CLASSES),
    hullColor: colour,
    trimColor: colour,
    accentColor: colour,
    sailColor: colour,
    sailPattern: z.enum(SAIL_PATTERNS),
    // a generous cap against junk, then repeats dropped (an accessory is fitted once)
    accessories: z
      .array(z.enum(ACCESSORIES))
      .max(32)
      .transform((list) => [...new Set(list)]),
    details: z
      .strictObject({ cabinColor: colour.optional(), roofColor: colour.optional(), bottomColor: colour.optional() })
      .default({})
  })
  .superRefine((v, ctx) => {
    for (const a of v.accessories)
      if (!ACCESSORY_FITS[a].includes(v.vesselClass))
        ctx.addIssue({ code: 'custom', path: ['accessories'], message: `That ${a} doesn't fit a ${v.vesselClass}` })
  })
