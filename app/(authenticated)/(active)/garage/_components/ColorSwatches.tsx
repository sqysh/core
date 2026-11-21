import { Check, Lock } from 'lucide-react'
import { itemDef, priceLabel } from '@/lib/vessel/items'
import type { Swatch } from '../_lib/swatches'

export function ColorSwatches({
  swatches,
  value,
  owns,
  onPick
}: {
  swatches: Swatch[]
  value: string
  owns: (id: string) => boolean
  onPick: (hex: string) => void
}) {
  const v = value.toLowerCase()
  // the boat's current colour is always offered, even if it isn't one of the locker's
  const list = !v || swatches.some((s) => s.hex === v) ? swatches : [{ hex: v, name: 'Current' }, ...swatches]
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(44px,1fr))] gap-2.5" role="radiogroup">
      {list.map((s) => {
        const on = s.hex === v
        const locked = !!s.unlock && !owns(s.unlock)
        const asComes = s.hex === ''
        const why = s.unlock ? priceLabel(itemDef(s.unlock).price) : ''
        return (
          <button
            key={s.hex || 'as-comes'}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={locked ? `${s.name} (locked: ${why})` : s.name}
            title={locked ? `${s.name} · ${why}` : s.name}
            disabled={locked}
            onClick={() => onPick(s.hex)}
            className={`relative aspect-square w-full max-w-12 justify-self-center rounded-full border transition-transform duration-150 active:scale-90 ${
              on ? 'border-white ring-2 ring-white ring-offset-2 ring-offset-[#0d3b4f]' : 'border-white/35'
            } ${locked ? 'opacity-55' : ''}`}
            style={{
              background: asComes ? 'conic-gradient(from 45deg, #c99a62, #e8ecef, #9aa3a8, #c99a62)' : s.hex,
              boxShadow: 'inset 0 2px 3px rgba(255,255,255,0.35), inset 0 -3px 6px rgba(0,0,0,0.25)'
            }}
          >
            {on && (
              <Check size={17} className="absolute inset-0 m-auto text-white mix-blend-difference" aria-hidden="true" />
            )}
            {locked && <Lock size={14} className="absolute inset-0 m-auto text-white drop-shadow" aria-hidden="true" />}
          </button>
        )
      })}
    </div>
  )
}
