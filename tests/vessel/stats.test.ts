// The stats system: every functional upgrade does what it says, levels change stats with real trade-offs, and nothing
// bought with real money (or any ability) bears on treasure.
import assert from 'node:assert/strict'
import { defaultVesselConfig, STAGE_IDS, STAGES, StageId, VesselConfig } from '@/lib/vessel/catalog'
import { ABILITIES, ACCESSORY_IDS, effectsOf, ITEM_IDS, itemDef, setStage } from '@/lib/vessel/items'
import { statChanges, vesselStats } from '@/lib/vessel/stats'
import { specOf } from '@/lib/harbor/vessel/modular'

let passed = 0
const test = (name: string, fn: () => void) => { fn(); passed++; console.log('  ✓', name) }
const base = defaultVesselConfig('m')
const at = (s: StageId) => setStage(base, s).config
const withPart = (c: VesselConfig, id: string) => ({ ...c, details: { ...c.details, parts: [...(c.details.parts ?? []), id] } })

test('every functional upgrade changes a stat the controller uses, on a boat it fits', () => {
  for (const id of ACCESSORY_IDS.filter((i) => itemDef(i).effect)) {
    const boat = at(itemDef(id).custom!.level >= 5 ? 'yacht' : itemDef(id).fit?.excludes?.includes('top:mast') ? 'cruiser' : 'cruiser')
    const changes = statChanges(vesselStats(boat), vesselStats(withPart(boat, id)))
    assert.ok(changes.some((c) => c.better), `${id} improves nothing`)
    // and it's in the spec the harbor sails by, not just the display
    const a = specOf(boat), b = specOf(withPart(boat, id))
    assert.notDeepEqual([a.handling, a.ride, a.range], [b.handling, b.ride, b.range], id)
  }
})

test('every level changes the boat’s stats from the one before', () => {
  for (const s of STAGE_IDS) {
    const from = STAGES[s].from as StageId | null
    if (!from) continue
    assert.ok(statChanges(vesselStats(at(from)), vesselStats(at(s))).length > 0, `${from} → ${s}`)
  }
})

test('bigger is not better at everything: real trade-offs between boats', () => {
  const skiff = vesselStats(at('skiff')), cruiser = vesselStats(at('cruiser')), grand = vesselStats(at('grand')), sloop = vesselStats(at('sloop'))
  assert.ok(skiff.turningCircle < grand.turningCircle, 'the skiff turns tighter than the grand yacht')
  assert.ok(skiff.draft < grand.draft, 'the skiff gets into shallower water')
  assert.ok(skiff.toTopSpeed < grand.toTopSpeed, 'the skiff gets going quicker')
  assert.ok(cruiser.topSpeed > grand.topSpeed, 'the cruiser is faster than the grand yacht')
  assert.ok(grand.stability > cruiser.stability && grand.range > cruiser.range && grand.deckSpace.total > cruiser.deckSpace.total)
  assert.ok(sloop.draft > cruiser.draft && sloop.range > cruiser.range, 'the sloop draws deeper and ranges further')
})

test('stats come from the boat itself: the same boat always gives the same stats, and none are stored', () => {
  assert.deepEqual(vesselStats(at('yacht')), vesselStats(at('yacht')))
  assert.ok(!('stats' in at('yacht').details))
})

test('real-money items are cosmetic only: no stat effects, no abilities', () => {
  for (const id of ITEM_IDS.filter((i) => itemDef(i).price.kind === 'purchase')) {
    assert.ok(!itemDef(id).effect && !itemDef(id).ability, `${id} is sold for money and must be cosmetic`)
  }
})

test('no ability bears on treasure', () => {
  for (const [id, a] of Object.entries(ABILITIES)) assert.ok(!/treasure/i.test(a.name) && (!/treasure/i.test(a.blurb) || /never treasure/i.test(a.blurb)), id)
})

test('effects stack predictably', () => {
  const fx = effectsOf(['perf:tune', 'engine:prop', 'perf:steering', 'perf:bow-thruster'])
  assert.ok(Math.abs(fx.cruise - 1.06 * 1.05) < 1e-9 && fx.turn === 1.12 && fx.steerage === 0.6)
})

console.log(`stats: ${passed} passed`)
