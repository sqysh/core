// The Garage's paint lockers: curated nautical colours, so every choice looks right on the water and the set of
// colours the harbor has to keep materials for stays small. Each list includes every colour the default boats are
// painted in (the 2D board's palettes), so a member who hasn't customised yet always finds their own colour here.

export type Swatch = { hex: string; name: string }

export const HULL: Swatch[] = [
  { hex: '#fbf6ec', name: 'Bone white' },
  { hex: '#26385f', name: 'Midnight navy' },
  { hex: '#2c5aa0', name: 'Harbor blue' },
  { hex: '#1d9ac7', name: 'Sea blue' },
  { hex: '#1f8a86', name: 'Teal' },
  { hex: '#3f8f5e', name: 'Spruce green' },
  { hex: '#c8382f', name: 'Lobster red' },
  { hex: '#e2405c', name: 'Coral red' },
  { hex: '#f2c14e', name: 'Buoy yellow' },
  { hex: '#e8743b', name: 'Signal orange' },
  { hex: '#b9784e', name: 'Varnished cedar' },
  { hex: '#2b2f36', name: 'Charcoal' }
]

export const TRIM: Swatch[] = [
  { hex: '#fbf6ec', name: 'Bone white' },
  { hex: '#f6e7c8', name: 'Cream' },
  { hex: '#26385f', name: 'Midnight navy' },
  { hex: '#2c5aa0', name: 'Harbor blue' },
  { hex: '#e2405c', name: 'Coral red' },
  { hex: '#c8382f', name: 'Lobster red' },
  { hex: '#f2c14e', name: 'Brass' },
  { hex: '#a8622d', name: 'Teak' },
  { hex: '#1f8a86', name: 'Teal' },
  { hex: '#2b2f36', name: 'Charcoal' }
]

export const ACCENT: Swatch[] = [
  { hex: '#f2c14e', name: 'Buoy yellow' },
  { hex: '#e2405c', name: 'Coral red' },
  { hex: '#2c5aa0', name: 'Harbor blue' },
  { hex: '#f58a5c', name: 'Sunset' },
  { hex: '#3f8f5e', name: 'Spruce green' },
  { hex: '#8e6bd8', name: 'Lavender' },
  { hex: '#1d9ac7', name: 'Sea blue' },
  { hex: '#fbf6ec', name: 'Bone white' },
  { hex: '#2b2f36', name: 'Charcoal' }
]

export const SAIL: Swatch[] = [
  { hex: '#fffdf8', name: 'Dacron white' },
  { hex: '#fff6e6', name: 'Ivory' },
  { hex: '#fff8ea', name: 'Linen' },
  { hex: '#f7ecd6', name: 'Canvas' },
  { hex: '#f2c9a4', name: 'Tanbark' },
  { hex: '#c8382f', name: 'Racing red' },
  { hex: '#26385f', name: 'Navy' },
  { hex: '#6fb7e0', name: 'Sky' },
  { hex: '#3f8f5e', name: 'Spruce' },
  { hex: '#2b2f36', name: 'Carbon' }
]

/** Cabin (a wheelhouse or coachroof), or the seats on a runabout */
export const CABIN: Swatch[] = [
  { hex: '#fbf6ec', name: 'Bone white' },
  { hex: '#f6e7c8', name: 'Cream' },
  { hex: '#e8d8b5', name: 'Sand' },
  { hex: '#9aa3a8', name: 'Fog grey' },
  { hex: '#26385f', name: 'Midnight navy' },
  { hex: '#2c5aa0', name: 'Harbor blue' },
  { hex: '#e2405c', name: 'Coral red' },
  { hex: '#a8622d', name: 'Teak' }
]

export const ROOF: Swatch[] = [
  { hex: '#2c5aa0', name: 'Harbor blue' },
  { hex: '#26385f', name: 'Midnight navy' },
  { hex: '#e2405c', name: 'Coral red' },
  { hex: '#c9354f', name: 'Deep red' },
  { hex: '#f2c14e', name: 'Buoy yellow' },
  { hex: '#3f8f5e', name: 'Spruce green' },
  { hex: '#fbf6ec', name: 'Bone white' },
  { hex: '#2b2f36', name: 'Charcoal' }
]

/** Antifouling below the waterline */
export const BOTTOM: Swatch[] = [
  { hex: '#a33c2e', name: 'Copper red' },
  { hex: '#2a3646', name: 'Navy' },
  { hex: '#1c1f24', name: 'Black' },
  { hex: '#3f5a3a', name: 'Green' },
  { hex: '#e8e2d6', name: 'White' }
]
