'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Anchor, Check, ChevronLeft, Lock, RotateCw, Ship } from 'lucide-react'
import { GlassButton, glassButton, glassPane, glassPanel } from '@/components/_shared/LiquidGlass'
import { LinkBody } from '@/components/_shared/LinkBody'
import { saveMyVessel } from '@/lib/actions/vessel/saveMyVessel'
import {
  ACCESSORIES,
  ACCESSORY_FITS,
  ACCESSORY_INFO,
  AccessoryId,
  COSMETICS,
  CosmeticId,
  SAIL_PATTERN_NAMES,
  SAIL_PATTERNS,
  VESSEL_CLASS_INFO,
  VESSEL_CLASSES,
  VesselClassId,
  VesselConfig,
  VesselDetails
} from '@/lib/vessel/catalog'
import { VESSEL_CLASS_SPECS } from '@/app/dev/checkin-voyage/_lib/vessel/classes'
import { lookOf } from '@/app/dev/checkin-voyage/_lib/vessel/look'
import { BoatSketch } from './_components/BoatSketch'
import { ACCENT, BOTTOM, CABIN, HULL, ROOF, SAIL, Swatch, TRIM } from './_lib/swatches'

// The Navigator's Boat Garage: choose a class, dress it, and save it to your account. The preview is the very model
// the TV's harbor sails, so what you see here is what arrives at check-in. Saving goes through saveMyVessel (validated
// on the server against the catalog and your unlocks); Cancel puts back what you last saved.

// the 3D preview's code (three, the boat models) only loads on devices that can run it
const BoatPreview = dynamic(() => import('@/app/dev/checkin-voyage/BoatPreview'), { ssr: false, loading: () => null })

type ColorField = 'hullColor' | 'trimColor' | 'accentColor' | 'sailColor'
type DetailField = keyof VesselDetails

type Tab =
  | { key: string; label: string; field: ColorField; swatches: Swatch[]; hint?: string; classes?: VesselClassId[] }
  | { key: string; label: string; detail: DetailField; swatches: Swatch[]; hint?: string; classes?: VesselClassId[] }
  | { key: 'sails'; label: string; classes?: VesselClassId[] }
  | { key: 'flags'; label: string }

const TABS: Tab[] = [
  { key: 'hull', label: 'Hull', field: 'hullColor', swatches: HULL },
  { key: 'trim', label: 'Trim', field: 'trimColor', swatches: TRIM, hint: 'Rub rail, sheer line and boot stripe' },
  { key: 'accent', label: 'Accent', field: 'accentColor', swatches: ACCENT, hint: 'Flags, stripes, buoys and canvas' },
  { key: 'cabin', label: 'Cabin', detail: 'cabinColor', swatches: CABIN },
  { key: 'roof', label: 'Roof', detail: 'roofColor', swatches: ROOF, classes: ['lobster'] },
  { key: 'sails', label: 'Sails', classes: ['sloop', 'lobster'] },
  { key: 'bottom', label: 'Bottom', detail: 'bottomColor', swatches: BOTTOM, hint: 'Antifouling below the waterline' },
  { key: 'flags', label: 'Flags' }
]

/** What the cabin colour paints on each class */
const CABIN_LABEL: Record<VesselClassId, string> = { runabout: 'Seats', lobster: 'Cabin', sloop: 'Cabin' }

/** Each class's character, from the same numbers the harbor sails it by */
const STATS = (() => {
  const s = VESSEL_CLASS_SPECS
  const max = (f: (k: VesselClassId) => number) => Math.max(...VESSEL_CLASSES.map(f))
  const min = (f: (k: VesselClassId) => number) => Math.min(...VESSEL_CLASSES.map(f))
  const speed = (k: VesselClassId) => s[k].handling.cruise
  const turn = (k: VesselClassId) => s[k].handling.turn
  const roll = (k: VesselClassId) => s[k].ride.roll
  return Object.fromEntries(
    VESSEL_CLASSES.map((k) => [
      k,
      [
        { label: 'Speed', value: speed(k) / max(speed) },
        { label: 'Handling', value: turn(k) / max(turn) },
        // a slower roll is a steadier boat
        { label: 'Stability', value: min(roll) / roll(k) }
      ]
    ])
  ) as Record<VesselClassId, { label: string; value: number }[]>
})()

const same = (a: VesselConfig, b: VesselConfig) => JSON.stringify(a) === JSON.stringify(b)

export default function GarageClient({
  initial,
  unlocked,
  storageReady,
  firstName
}: {
  initial: VesselConfig
  unlocked: CosmeticId[]
  /** False when saving isn't available yet (the vessel tables haven't been created) */
  storageReady: boolean
  firstName: string
}) {
  const [saved, setSaved] = useState(initial)
  const [draft, setDraft] = useState(initial)
  const [tab, setTab] = useState('hull')
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)
  // the 3D preview makes (and checks) its own WebGL context; only when it reports it can't does the 2D drawing show
  const [previewFailed, setPreviewFailed] = useState(false)

  const dirty = !same(draft, saved)
  const look = useMemo(() => lookOf(draft), [draft])
  const kind = draft.vesselClass
  const tabs = TABS.filter((t) => !('classes' in t) || !t.classes || t.classes.includes(kind))
  const current = tabs.find((t) => t.key === tab) ?? tabs[0]

  useEffect(() => {
    if (!notice) return
    const t = window.setTimeout(() => setNotice(null), 3200)
    return () => window.clearTimeout(t)
  }, [notice])
  // leaving with unsaved changes asks first
  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  function chooseClass(next: VesselClassId) {
    setDraft((d) => ({
      ...d,
      vesselClass: next,
      // an accessory that doesn't fit the new class comes off (a burgee needs a masthead)
      accessories: d.accessories.filter((a) => ACCESSORY_FITS[a].includes(next))
    }))
  }
  const setColor = (field: ColorField, hex: string) => setDraft((d) => ({ ...d, [field]: hex }))
  const setDetail = (field: DetailField, hex: string) =>
    setDraft((d) => ({ ...d, details: { ...d.details, [field]: hex } }))
  const isUnlocked = (id: CosmeticId) => COSMETICS[id].free || unlocked.includes(id)

  function toggleAccessory(a: AccessoryId) {
    setDraft((d) => ({
      ...d,
      accessories: d.accessories.includes(a) ? d.accessories.filter((x) => x !== a) : [...d.accessories, a]
    }))
  }

  async function save() {
    if (!dirty || saving) return
    setSaving(true)
    const res = await saveMyVessel(draft)
    setSaving(false)
    if (res.success) {
      setSaved(res.data)
      setDraft(res.data)
      setNotice({ tone: 'ok', text: 'Saved. This is the boat that sails in when you check in.' })
    } else setNotice({ tone: 'error', text: res.error })
  }

  /** The colour a swatch tab currently shows (details fall back to the class's own default, as the boat does) */
  function currentHex(t: Tab) {
    if ('field' in t) return draft[t.field]
    if ('detail' in t)
      return t.detail === 'cabinColor' ? look.cabin : t.detail === 'roofColor' ? look.roof : look.bottom
    return ''
  }

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-[radial-gradient(120%_70%_at_50%_0%,#123a5a_0%,#0a1f33_45%,#050d17_100%)] text-white landscape:grid landscape:grid-cols-[1.15fr_1fr]">
      {/* ── the boat ── */}
      <section className="relative h-[46dvh] shrink-0 landscape:h-full" aria-label="Boat preview">
        {/* the real 3D boat; it makes its own WebGL context, and only if none can be made does the 2D drawing show */}
        {previewFailed ? (
          <div className="absolute inset-x-6 bottom-10 top-20">
            <BoatSketch kind={kind} look={look} />
          </div>
        ) : (
          <BoatPreview config={draft} onUnsupported={() => setPreviewFailed(true)} />
        )}

        {/* top bar */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center gap-3 pl-[max(14px,env(safe-area-inset-left))] pr-[max(14px,env(safe-area-inset-right))] pt-[max(14px,env(safe-area-inset-top))]">
          <Link
            href="/dashboard"
            aria-label="Back to the dashboard"
            className={`${glassButton()} pointer-events-auto h-11 w-11 shrink-0 rounded-full`}
          >
            <LinkBody icon={<ChevronLeft size={20} aria-hidden="true" />} spinnerClass="h-4 w-4" />
          </Link>
          <div className="min-w-0 [text-shadow:0_1px_4px_rgba(4,16,32,0.6)]">
            <p className="m-0 font-mono text-[10px] uppercase tracking-[0.3em] text-sky-300">Boat Garage</p>
            <p className="m-0 truncate font-sora text-[17px] font-black leading-tight">
              {firstName}’s {VESSEL_CLASS_INFO[kind].name}
            </p>
          </div>
        </div>

        {!previewFailed && (
          <p className="pointer-events-none absolute bottom-3 left-1/2 m-0 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.2em] text-white/55">
            <RotateCw size={12} aria-hidden="true" /> Drag to turn her
          </p>
        )}
      </section>

      {/* ── the workshop ── */}
      <section className="relative flex min-h-0 flex-1 flex-col landscape:h-full">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 pl-[max(16px,env(safe-area-inset-left))] pr-[max(16px,env(safe-area-inset-right))] pt-3 landscape:pt-[max(14px,env(safe-area-inset-top))]">
          {/* class */}
          <p className="m-0 mb-2 font-mono text-[10px] uppercase tracking-[0.25em] text-white/55">Choose your boat</p>
          <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 scrollbar-none">
            {VESSEL_CLASSES.map((k) => {
              const on = k === kind
              const locked = !isUnlocked(`class:${k}`)
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => !locked && chooseClass(k)}
                  aria-pressed={on}
                  disabled={locked}
                  className={`${glassPanel} w-[74%] max-w-72 shrink-0 snap-start rounded-2xl p-4 text-left transition-[border-color,background-color,transform] duration-200 active:scale-[0.98] disabled:opacity-50 ${
                    on ? 'border-sky-200/60 bg-sky-400/15' : ''
                  }`}
                >
                  <span className="flex items-center justify-between">
                    <span className="font-sora text-[17px] font-black">{VESSEL_CLASS_INFO[k].name}</span>
                    {on ? (
                      <Check size={18} className="text-sky-300" aria-hidden="true" />
                    ) : locked ? (
                      <Lock size={16} className="text-white/60" aria-hidden="true" />
                    ) : null}
                  </span>
                  <span className="mt-1 block font-nunito text-[13px] leading-snug text-white/70">
                    {VESSEL_CLASS_INFO[k].tagline}
                  </span>
                  <span className="mt-3 grid gap-1.5">
                    {STATS[k].map((s) => (
                      <span key={s.label} className="flex items-center gap-2">
                        <span className="w-17 font-mono text-[9px] uppercase tracking-[0.15em] text-white/55">
                          {s.label}
                        </span>
                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                          <span
                            className="block h-full rounded-full bg-sky-300/80"
                            style={{ width: `${Math.round(s.value * 100)}%` }}
                          />
                        </span>
                      </span>
                    ))}
                  </span>
                </button>
              )
            })}
          </div>

          {/* what to paint */}
          <div
            className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 scrollbar-none"
            role="tablist"
            aria-label="Customise"
          >
            {tabs.map((t) => (
              <GlassButton
                key={t.key}
                role="tab"
                aria-selected={t.key === current.key}
                tone={t.key === current.key ? 'active' : 'default'}
                onClick={() => setTab(t.key)}
                className="h-10 shrink-0 rounded-full px-4 text-[13px]"
              >
                {t.key === 'cabin' ? CABIN_LABEL[kind] : t.label}
              </GlassButton>
            ))}
          </div>

          <div className={`${glassPane} mt-3 p-4`} role="tabpanel">
            {'swatches' in current && (
              <>
                {current.hint && <p className="m-0 mb-3 font-nunito text-[13px] text-white/60">{current.hint}</p>}
                <Swatches
                  swatches={current.swatches}
                  value={currentHex(current)}
                  onPick={(hex) => ('field' in current ? setColor(current.field, hex) : setDetail(current.detail, hex))}
                />
              </>
            )}

            {current.key === 'sails' && (
              <>
                <Swatches swatches={SAIL} value={draft.sailColor} onPick={(hex) => setColor('sailColor', hex)} />
                <p className="m-0 mb-2 mt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-white/55">Pattern</p>
                <div className="grid grid-cols-3 gap-2">
                  {SAIL_PATTERNS.map((p) => {
                    const locked = !isUnlocked(`pattern:${p}`)
                    return (
                      <GlassButton
                        key={p}
                        tone={draft.sailPattern === p ? 'active' : 'default'}
                        aria-pressed={draft.sailPattern === p}
                        disabled={locked}
                        onClick={() => setDraft((d) => ({ ...d, sailPattern: p }))}
                        className="h-11 text-[13px]"
                      >
                        {locked && <Lock size={13} aria-hidden="true" />}
                        {SAIL_PATTERN_NAMES[p]}
                      </GlassButton>
                    )
                  })}
                </div>
                <p className="m-0 mt-3 font-nunito text-[12px] text-white/50">Patterns use your accent colour.</p>
              </>
            )}

            {current.key === 'flags' && (
              <div className="grid gap-2">
                {ACCESSORIES.map((a) => {
                  const fits = ACCESSORY_FITS[a].includes(kind)
                  const locked = !isUnlocked(`accessory:${a}`)
                  const on = draft.accessories.includes(a)
                  return (
                    <button
                      key={a}
                      type="button"
                      role="switch"
                      aria-checked={on}
                      disabled={!fits || locked}
                      onClick={() => toggleAccessory(a)}
                      className={`${glassButton(on ? 'active' : 'default')} min-h-14 justify-between px-4 py-3 text-left`}
                    >
                      <span>
                        <span className="block text-[14px]">{ACCESSORY_INFO[a].name}</span>
                        <span className="block font-nunito text-[12px] font-normal text-white/60">
                          {locked
                            ? 'Locked: found out on the water, later'
                            : !fits
                              ? `Needs a mast (${VESSEL_CLASS_INFO.sloop.name})`
                              : ACCESSORY_INFO[a].description}
                        </span>
                      </span>
                      {locked ? (
                        <Lock size={16} aria-hidden="true" />
                      ) : (
                        <span
                          className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${on ? 'bg-sky-400/70' : 'bg-white/15'}`}
                          aria-hidden="true"
                        >
                          <span
                            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-[left] ${on ? 'left-4.5' : 'left-0.5'}`}
                          />
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* the next chapter: steering your boat from your phone */}
          <div className={`${glassPane} mt-4 flex items-center gap-3 p-4 opacity-70`}>
            <Ship size={20} className="shrink-0 text-sky-300" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="m-0 font-sora text-[14px] font-black">Take the Helm</p>
              <p className="m-0 font-nunito text-[12px] text-white/60">
                Steer her around the harbor from your phone. Coming soon.
              </p>
            </div>
            <GlassButton
              disabled
              className="h-10 shrink-0 rounded-full px-4 text-[12px]"
              aria-label="Take the Helm (coming soon)"
            >
              <Anchor size={14} aria-hidden="true" /> Soon
            </GlassButton>
          </div>
        </div>

        {/* save / cancel, always under the thumb */}
        <div className="shrink-0 border-t border-white/10 bg-[#06101b]/60 px-4 pb-[max(14px,env(safe-area-inset-bottom))] pl-[max(16px,env(safe-area-inset-left))] pr-[max(16px,env(safe-area-inset-right))] pt-3 backdrop-blur-xl">
          {notice && (
            <p
              role="status"
              className={`m-0 mb-2 text-center font-nunito text-[13px] ${notice.tone === 'ok' ? 'text-emerald-300' : 'text-red-300'}`}
            >
              {notice.text}
            </p>
          )}
          {!storageReady && (
            <p role="status" className="m-0 mb-2 text-center font-nunito text-[12px] text-amber-200/90">
              Saving isn’t switched on yet. You can try everything; it won’t be kept.
            </p>
          )}
          <div className="grid grid-cols-[1fr_1.4fr] gap-3">
            <GlassButton onClick={() => setDraft(saved)} disabled={!dirty || saving} className="h-12 text-[15px]">
              Cancel
            </GlassButton>
            <GlassButton
              tone="primary"
              onClick={save}
              disabled={!dirty || saving || !storageReady}
              className="h-12 text-[15px]"
            >
              {saving ? 'Saving…' : dirty ? 'Save boat' : 'Saved'}
            </GlassButton>
          </div>
        </div>
      </section>
    </div>
  )
}

function Swatches({ swatches, value, onPick }: { swatches: Swatch[]; value: string; onPick: (hex: string) => void }) {
  // the boat's current colour is always offered, even if it isn't one of the locker's
  const list =
    swatches.some((s) => s.hex === value.toLowerCase()) || !value
      ? swatches
      : [{ hex: value.toLowerCase(), name: 'Current' }, ...swatches]
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(44px,1fr))] gap-3">
      {list.map((s) => {
        const on = s.hex === value.toLowerCase()
        return (
          <button
            key={s.hex}
            type="button"
            onClick={() => onPick(s.hex)}
            aria-label={s.name}
            aria-pressed={on}
            title={s.name}
            className={`relative aspect-square w-full max-w-14 justify-self-center rounded-full border transition-transform duration-150 active:scale-90 ${
              on ? 'border-white ring-2 ring-sky-300 ring-offset-2 ring-offset-[#0a1f33]' : 'border-white/30'
            }`}
            style={{
              background: s.hex,
              boxShadow: 'inset 0 2px 3px rgba(255,255,255,0.35), inset 0 -3px 6px rgba(0,0,0,0.25)'
            }}
          >
            {on && (
              <Check size={18} className="absolute inset-0 m-auto text-white mix-blend-difference" aria-hidden="true" />
            )}
          </button>
        )
      })}
    </div>
  )
}
