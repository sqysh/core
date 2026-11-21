'use client'

import { GlassButton } from '@/components/_shared/LiquidGlass'
import { ACCESSORIES, FINISH_NAMES, FINISHES, SAIL_PATTERNS } from '@/lib/vessel/catalog'
import { fitProblem, itemDef } from '@/lib/vessel/items'
import { useGarageContext } from '../_hooks/GarageContext'
import { PAINT_PARTS, PaintPart } from '../_lib/garage'
import { label, row } from '../_lib/styles'
import { SAIL } from '../_lib/swatches'
import { AccessoryRow } from './AccessoryRow'
import { ColorSwatches } from './ColorSwatches'

/** Paint: the finish, a colour for each part of the boat, her sails, and (on a heritage boat) her flags */
export function PaintTab() {
  const { draft, setDraft, look, owns, sails, heritage, paintPart, setPaintKey } = useGarageContext()

  function paint(p: PaintPart, hex: string) {
    if (p.field) setDraft((d) => ({ ...d, [p.field!]: hex }))
    else if (p.detail)
      setDraft((d) => {
        const details = { ...d.details }
        // '' is "as the boat comes" (bare teak, chrome): the setting is removed rather than saved empty
        if (hex) details[p.detail!] = hex
        else delete details[p.detail!]
        return { ...d, details }
      })
  }
  function currentHex(p: PaintPart) {
    if (p.field) return draft[p.field]
    const v = draft.details[p.detail!]
    if (v) return v
    return p.detail === 'cabinColor'
      ? look.cabin
      : p.detail === 'roofColor'
        ? look.roof
        : p.detail === 'bottomColor'
          ? look.bottom
          : p.detail === 'seatsColor'
            ? look.seats
            : ''
  }

  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-3 gap-1.5 rounded-2xl bg-black/15 p-1" role="radiogroup" aria-label="Finish">
        {FINISHES.map((f) => {
          const on = (draft.details.finish ?? 'gloss') === f
          return (
            <button
              key={f}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={!owns(`finish:${f}`)}
              onClick={() => setDraft((d) => ({ ...d, details: { ...d.details, finish: f } }))}
              className={`h-10 rounded-xl font-sora text-[13px] font-bold transition-colors ${on ? 'bg-white/90 text-[#06101b]' : 'text-white/80 hover:bg-white/10'}`}
            >
              {FINISH_NAMES[f]}
            </button>
          )
        })}
      </div>
      <div
        className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none]"
        role="tablist"
        aria-label="What to paint"
      >
        {PAINT_PARTS.map((p) => (
          <GlassButton
            key={p.key}
            role="tab"
            aria-selected={p.key === paintPart.key}
            tone={p.key === paintPart.key ? 'active' : 'default'}
            onClick={() => setPaintKey(p.key)}
            className="h-9 shrink-0 rounded-full px-3.5 text-[12px]"
          >
            {p.label}
          </GlassButton>
        ))}
      </div>
      <ColorSwatches
        swatches={paintPart.swatches}
        value={currentHex(paintPart)}
        owns={owns}
        onPick={(hex) => paint(paintPart, hex)}
      />
      <GlassButton
        onClick={() =>
          setDraft((d) => ({
            ...d,
            hullColor: '#000000',
            trimColor: '#000000',
            accentColor: '#000000',
            sailColor: '#000000',
            details: {
              ...d.details,
              cabinColor: '#000000',
              roofColor: '#000000',
              seatsColor: '#000000',
              deckColor: '#000000',
              equipmentColor: '#000000',
              bottomColor: '#000000',
              finish: 'matte'
            }
          }))
        }
        className="h-10 text-[13px]"
      >
        <span className="h-4 w-4 rounded-full border border-white/40 bg-black" aria-hidden="true" /> All matte black
      </GlassButton>
      {sails && (
        <section className="grid gap-2">
          <p className={label}>Sails</p>
          <ColorSwatches
            swatches={SAIL}
            value={draft.sailColor}
            owns={owns}
            onPick={(hex) => setDraft((d) => ({ ...d, sailColor: hex }))}
          />
          <ul className="m-0 grid list-none gap-2 p-0">
            {SAIL_PATTERNS.map((p) => (
              <AccessoryRow key={p} id={`pattern:${p}`} />
            ))}
          </ul>
        </section>
      )}
      {heritage && (
        <section className="grid gap-2">
          <p className={label}>Flags</p>
          <ul className="m-0 grid list-none gap-2 p-0">
            {ACCESSORIES.map((a) => {
              const on = draft.accessories.includes(a)
              const problem = fitProblem(`accessory:${a}`, draft)
              return (
                <li key={a} className={`${row(on)} min-h-14 px-3.5 py-2.5`}>
                  <span className="text-[14px]">{itemDef(`accessory:${a}`).name}</span>
                  {problem ? (
                    <span className="font-nunito text-[11px] text-white/55">{problem}</span>
                  ) : (
                    <GlassButton
                      onClick={() =>
                        setDraft((d) => ({
                          ...d,
                          accessories: on ? d.accessories.filter((x) => x !== a) : [...d.accessories, a]
                        }))
                      }
                      disabled={!on && !owns(`accessory:${a}`)}
                      className="h-9 rounded-full px-3.5 text-[12px]"
                    >
                      {on ? 'Fitted' : 'Fit'}
                    </GlassButton>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
