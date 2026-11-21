import type { StageId } from '@/lib/vessel/catalog'
import { roomUsed, ZONE_NAMES } from '@/lib/vessel/items'

/** How full each deck zone is */
export function RoomMeters({ stage, chosen }: { stage: StageId; chosen: string[] }) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1.5">
      {roomUsed(stage, chosen).map(({ zone, used, total }) => (
        <span key={zone} className="flex items-center gap-1.5">
          <span className="font-mono text-[9px] uppercase tracking-widest text-white/55">{ZONE_NAMES[zone]}</span>
          <span className="flex gap-0.5" aria-label={`${used} of ${total} spots used`}>
            {Array.from({ length: total }, (_, i) => (
              <span key={i} className={`h-2 w-2 rounded-sm ${i < used ? 'bg-sky-300/85' : 'bg-white/15'}`} />
            ))}
          </span>
        </span>
      ))}
    </div>
  )
}
