/** A short value that is plainly a test: nothing in CORE reads it */
export const TEST_VALUE = 'CORE-TEST-INVISIBLE-QR'

export const BLEND_MODES = [
  'normal',
  'multiply',
  'screen',
  'overlay',
  'soft-light',
  'hard-light',
  'difference',
  'luminosity'
] as const
export type BlendMode = (typeof BLEND_MODES)[number]

/** How the code is put on the scene: a see-through black-and-white layer, or changes to the scene's blue channel alone */
export type Encoding = 'overlay' | 'blue' | 'balanced'
/** Blue channel: which way the change goes. Darken lowers the blue of the dark modules; lighten raises it everywhere else */
export type BlueDirection = 'darken' | 'lighten'

export type QrSettings = {
  encoding: Encoding
  /** Whole layer, 0–100 */
  opacity: number
  /** Side of the square, as a percentage of the viewport's height, 10–90 */
  size: number
  foreground: string
  background: string
  /** 0–100 */
  backgroundOpacity: number
  /** Where the square sits within the room the screen leaves it, 0–100 each way */
  x: number
  y: number
  blend: BlendMode
  /** Blue channel encoding: how far the blue moves, as a percentage of its full range, 0–100 */
  strength: number
  direction: BlueDirection
  /** Balanced chrominance: the colour its brightness compensation is solved at (the sea's typical colour) */
  reference: string
}

export const PRESETS = {
  control: {
    label: 'Control',
    note: 'Standard black and white',
    settings: {
      opacity: 100,
      size: 60,
      foreground: '#000000',
      background: '#ffffff',
      backgroundOpacity: 100,
      x: 50,
      y: 50,
      blend: 'normal',
      encoding: 'overlay',
      strength: 20,
      direction: 'darken',
      reference: '#5bb8ac'
    }
  },
  subtle: {
    label: 'Subtle',
    note: 'Low-contrast turquoise',
    settings: {
      opacity: 60,
      size: 70,
      foreground: '#0b6f80',
      background: '#4fc3d0',
      backgroundOpacity: 35,
      x: 50,
      y: 50,
      blend: 'normal',
      encoding: 'overlay',
      strength: 20,
      direction: 'darken',
      reference: '#5bb8ac'
    }
  },
  invisible: {
    label: 'Nearly invisible',
    note: 'Very low contrast, blended into the sea',
    settings: {
      opacity: 14,
      size: 80,
      foreground: '#0b6f80',
      background: '#1a8ea3',
      backgroundOpacity: 0,
      x: 50,
      y: 50,
      blend: 'multiply',
      encoding: 'overlay',
      strength: 20,
      direction: 'darken',
      reference: '#5bb8ac'
    }
  },
  blue: {
    label: 'Blue Channel',
    note: "The code written into the scene's blue channel only",
    settings: {
      opacity: 100,
      size: 80,
      foreground: '#000000',
      background: '#ffffff',
      backgroundOpacity: 0,
      x: 50,
      y: 50,
      blend: 'normal',
      encoding: 'blue',
      strength: 20,
      direction: 'darken',
      reference: '#5bb8ac'
    }
  },
  balanced: {
    label: 'Balanced Chrominance',
    note: 'Opposite blue shifts on dark and light modules, brightness kept with red and green',
    settings: {
      opacity: 100,
      size: 80,
      foreground: '#000000',
      background: '#ffffff',
      backgroundOpacity: 0,
      x: 50,
      y: 50,
      blend: 'normal',
      encoding: 'balanced',
      strength: 15,
      direction: 'darken',
      reference: '#5bb8ac'
    }
  }
} satisfies Record<string, { label: string; note: string; settings: QrSettings }>

export type PresetKey = keyof typeof PRESETS
