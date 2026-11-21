import jsQR from 'jsqr'
import {
  blueGreenRatio,
  blueMinusGreen,
  localContrast,
  PREPARATIONS,
  stretch,
  toGray,
  toRgba
} from '@/lib/utils/qrPreprocess'

/** What read a code: the picture as it came, or the named preparation of it */
export type QrRead = { text: string; via: string }

/**
 * Reads QR codes from camera frames. Every frame is tried as it is first (the quick, ordinary read). When that fails, ONE
 * preparation from qrPreprocess is tried per frame, in turn, so a slow phone does a little extra work per frame
 * instead of all of it at once, and every preparation still gets its go within a second or two.
 */
export function createQrDecoder() {
  let next = 0
  return {
    decode(frame: ImageData): QrRead | null {
      const plain = jsQR(frame.data, frame.width, frame.height, { inversionAttempts: 'dontInvert' })
      if (plain?.data) return { text: plain.data, via: 'as seen' }

      const prep = PREPARATIONS[next]
      next = (next + 1) % PREPARATIONS.length
      const img = prep.run(frame)
      const code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' })
      return code?.data ? { text: code.data, via: prep.name } : null
    }
  }
}

/**
 * TEMPORARY, for comparing ways of reading on a real phone: each method is exactly one way (no fallbacks), with the
 * width the frame is drawn at before it is read. `original` is the first version, kept as it was.
 */
export const DECODE_METHODS = {
  original: {
    label: 'Original (640 px)',
    width: 640,
    run: (f: ImageData) => jsQR(f.data, f.width, f.height, { inversionAttempts: 'dontInvert' })?.data ?? null
  },
  highres: {
    label: 'High resolution (1280 px)',
    width: 1280,
    run: (f: ImageData) => jsQR(f.data, f.width, f.height, { inversionAttempts: 'dontInvert' })?.data ?? null
  },
  stretch: {
    label: 'Grayscale contrast',
    width: 1280,
    run: (f: ImageData) => readGray(toRgba(stretch(toGray(f, 'luma'))))
  },
  adaptive: {
    label: 'Adaptive contrast',
    width: 1280,
    run: (f: ImageData) => readGray(toRgba(localContrast(toGray(f, 'luma'))))
  },
  red: { label: 'Red channel', width: 1280, run: (f: ImageData) => readGray(toRgba(toGray(f, 'r'))) },
  green: { label: 'Green channel', width: 1280, run: (f: ImageData) => readGray(toRgba(toGray(f, 'g'))) },
  blue: { label: 'Blue channel', width: 1280, run: (f: ImageData) => readGray(toRgba(toGray(f, 'b'))) },
  blueStretch: {
    label: 'Blue + contrast stretch',
    width: 1280,
    run: (f: ImageData) => readGray(toRgba(stretch(toGray(f, 'b'))))
  },
  blueAdaptive: {
    label: 'Blue + adaptive contrast',
    width: 1280,
    run: (f: ImageData) => readGray(toRgba(localContrast(toGray(f, 'b'))))
  },
  blueMinusGreen: {
    label: 'Blue minus green',
    width: 1280,
    run: (f: ImageData) => readGray(toRgba(blueMinusGreen(f)))
  },
  blueGreenRatio: {
    label: 'Blue/green ratio',
    width: 1280,
    run: (f: ImageData) => readGray(toRgba(blueGreenRatio(f)))
  },
  blueGreenRatioAdaptive: {
    label: 'Blue/green ratio + adaptive',
    width: 1280,
    run: (f: ImageData) => readGray(toRgba(localContrast(blueGreenRatio(f))))
  }
}
export type DecodeMethod = keyof typeof DECODE_METHODS

function readGray(img: { data: Uint8ClampedArray; width: number; height: number }) {
  return jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' })?.data ?? null
}
