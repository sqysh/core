import { ART_H, ART_W, BOATS, Palette } from '@/app/(authenticated)/(active)/attendance/_lib/boats'
import { VesselLook } from '@/app/dev/checkin-voyage/_lib/vessel/look'
import { HeritageClassId, VesselClassId } from '@/lib/vessel/catalog'

// The boat drawn flat, in the member's colours, for a phone that can't run the 3D preview: the same illustrations the
// check-in board sails, so it's still recognisably their boat. (The board's art has no runabout; its yacht is the
// small powerboat that matches, as the boat sounds already pair them.)

const ART_FOR: Record<HeritageClassId, string> = { runabout: 'yacht', lobster: 'lobster', sloop: 'sloop' }

/** A modular boat is drawn as the illustration closest to what it's built as */
const artFor = (kind: VesselClassId, look: VesselLook) =>
  kind !== 'modular'
    ? ART_FOR[kind]
    : look.parts?.includes('top:mast')
      ? 'sloop'
      : look.parts?.includes('top:wheelhouse')
        ? 'lobster'
        : 'yacht'

/** A colour a little darker, for the shaded side (plain arithmetic: this file mustn't pull in the 3D library) */
const shade = (hex: string, k = 0.78) =>
  '#' +
  [1, 3, 5]
    .map((i) =>
      Math.round(parseInt(hex.slice(i, i + 2), 16) * k)
        .toString(16)
        .padStart(2, '0')
    )
    .join('')

export function BoatSketch({ kind, look }: { kind: VesselClassId; look: VesselLook }) {
  const art = BOATS.find((b) => b.key === artFor(kind, look)) ?? BOATS[0]
  const palette: Palette = {
    hull: look.hull,
    hullShade: shade(look.hull),
    trim: look.trim,
    cabin: look.cabin,
    cabinShade: shade(look.cabin, 0.85),
    roof: look.roof,
    sail: look.sail,
    sailShade: shade(look.sail, 0.86),
    accent: look.accent
  }
  return (
    <svg viewBox={`0 0 ${ART_W} ${ART_H}`} className="h-full w-full" role="img" aria-label="Your boat">
      <defs>
        <clipPath id="garage-above-water">
          <rect x="0" y="0" width={ART_W} height="171" />
        </clipPath>
      </defs>
      <g clipPath="url(#garage-above-water)">{art.art(palette)}</g>
      <rect x="0" y="170" width={ART_W} height={ART_H - 170} fill="#1a8ea3" opacity="0.55" />
      <path
        d={`M0 171 Q 30 166 60 171 T 120 171 T 180 171 T 240 171`}
        fill="none"
        stroke="#e8fbff"
        strokeOpacity="0.6"
        strokeWidth="2"
      />
    </svg>
  )
}
