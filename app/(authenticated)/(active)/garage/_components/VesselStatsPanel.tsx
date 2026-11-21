import { ABILITIES } from '@/lib/vessel/items'
import { rangeName, STAT_ROWS, statText, VesselStats } from '@/lib/vessel/stats'

/**
 * How she performs as built: the numbers the harbor's controller sails her by, with what she's able to do. Abilities
 * come into play with Free Sail, the member's own helm.
 */
export function VesselStatsPanel({ stats }: { stats: VesselStats }) {
  return (
    <div className="grid gap-2">
      <ul className="m-0 grid list-none grid-cols-2 gap-x-3 gap-y-1.5 p-0">
        {STAT_ROWS.map((r) => (
          <li key={r.key} className="min-w-0">
            <span className="flex items-baseline justify-between gap-2">
              <span className="font-mono text-[8px] uppercase tracking-widest text-white/55">{r.label}</span>
              <span className="font-mono text-[10px] text-white/85">
                {r.key === 'range' ? rangeName(stats.range) : statText(r, stats[r.key])}
              </span>
            </span>
            <span className="mt-1 block h-1 overflow-hidden rounded-full bg-white/12">
              <span
                className="block h-full rounded-full bg-linear-to-r from-sky-300 to-emerald-300 transition-[width] duration-500"
                style={{
                  width: `${Math.round(Math.min(1, Math.max(0.06, r.better === 'up' ? stats[r.key] / r.max : 1 - stats[r.key] / r.max)) * 100)}%`
                }}
              />
            </span>
          </li>
        ))}
      </ul>
      {stats.abilities.length > 0 && (
        <p className="m-0 font-nunito text-[11px] leading-snug text-sky-200/90">
          <b>Abilities:</b> {stats.abilities.map((a) => ABILITIES[a].name).join(', ')}
          <span className="text-white/45"> · with Free Sail</span>
        </p>
      )}
    </div>
  )
}
