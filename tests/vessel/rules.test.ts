// Pure rules for vessel levels and accessories: every level a valid build, room on deck, prices, prerequisites, growth.
import assert from 'node:assert/strict'
import { vesselConfigSchema } from '@/lib/schemas/vessel.schema'
import { accessoriesOf, defaultVesselConfig, equippedItems, partsOf, STAGE_IDS, StageId, stageOf, STAGES, STRUCTURAL, VesselConfig } from '@/lib/vessel/catalog'
import {
  ACCESSORY_IDS, allocate, buildProblems, fitAccessory, fitProblem, FREE_ITEMS, isLive, ITEM_IDS, itemDef, ItemId, maxLevel,
  needsProblem, NO_STATS, removeAccessory, roomUsed, setStage, settle, stagePrice
} from '@/lib/vessel/items'
import { readVessel } from '@/lib/vessel/persistence'
import { layoutOf, specOf } from '@/app/dev/checkin-voyage/_lib/vessel/modular'
import { VESSEL_CLASS_SPECS } from '@/app/dev/checkin-voyage/_lib/vessel/classes'

let passed = 0
const test = (name: string, fn: () => void) => { fn(); passed++; console.log('  ✓', name) }
const base = defaultVesselConfig('member-1')
const at = (stage: StageId, acc: string[] = []) => acc.reduce((c, id) => fitAccessory(c, id as ItemId).config, setStage(base, stage).config)

test('everyone starts with the same skiff: valid, buildable, and free', () => {
  assert.equal(stageOf(base), 'skiff')
  assert.deepEqual(accessoriesOf(base), [])
  assert.ok(vesselConfigSchema.safeParse(base).success)
  assert.deepEqual(buildProblems(base), [])
  for (const id of equippedItems(base)) assert.ok(FREE_ITEMS.includes(id as ItemId), `${id} should be free`)
})

test('every vessel level is a valid build of real parts, and no accessory is ever structural', () => {
  for (const s of STAGE_IDS) {
    const c = setStage(base, s).config
    assert.deepEqual(buildProblems(c), [], s)
    for (const p of STAGES[s].parts) {
      assert.ok(itemDef(p as ItemId).category && !itemDef(p as ItemId).custom, `${s}: ${p}`)
      assert.equal(fitProblem(p as ItemId, c), null, `${s}: ${p} doesn't fit its own level`)
    }
  }
  for (const id of ACCESSORY_IDS) assert.ok(!STRUCTURAL.has(id), id)
})

test('each upgrade genuinely grows the boat: longer or equal, taller, more room on deck', () => {
  for (const s of STAGE_IDS) {
    const from = STAGES[s].from as StageId | null
    if (!from) continue
    const a = specOf(setStage(base, from).config).dims
    const b = specOf(setStage(base, s).config).dims
    assert.ok(b.length >= a.length && b.beam >= a.beam * 0.99, `${from} → ${s} size`)
    const room = (id: StageId) => roomUsed(id, []).reduce((n, z) => n + z.total, 0)
    assert.ok(room(s) > room(from), `${from} → ${s} room`)
  }
  const grand = layoutOf(partsOf(setStage(base, 'grand').config), 'grand')
  assert.ok(grand.skyRoof && grand.flybridge && grand.platform, 'three levels and a swim platform')
})

test('the paths divide: from the Center Console, a Cruiser or a Sloop', () => {
  const next = STAGE_IDS.filter((s) => STAGES[s].from === 'console')
  assert.deepEqual(next.sort(), ['cruiser', 'sloop'])
  assert.match(needsProblem('stage:grand', NO_STATS, ['stage:launch', 'stage:console', 'stage:sloop', 'stage:bluewater'])!, /Flybridge Yacht/)
  assert.equal(needsProblem('stage:bluewater', NO_STATS, ['stage:sloop']), null)
})

test('accessories unlock at a level, but unlocking never buys them', () => {
  assert.match(needsProblem('fun:hot-tub', NO_STATS, ['stage:launch', 'stage:console'])!, /Level 4/)
  assert.equal(needsProblem('fun:hot-tub', NO_STATS, ['stage:cruiser']), null)
  assert.ok(!FREE_ITEMS.includes('fun:hot-tub'))
  assert.equal(maxLevel(['stage:launch', 'stage:sloop']), 4)
})

test('accessories need their mounts and a level to stand on', () => {
  assert.match(fitProblem('fun:slide', at('cruiser'))!, /Level 5|flybridge/)
  assert.equal(fitProblem('fun:slide', at('yacht')), null)
  assert.match(fitProblem('fun:garden', at('yacht'))!, /Level 6|sky roof/)
  assert.equal(fitProblem('fun:garden', at('grand')), null)
  assert.match(fitProblem('decor:pennant', at('cruiser'))!, /mast|Level/)
  assert.equal(fitProblem('decor:pennant', at('sloop')), null)
  assert.match(fitProblem('fun:jet-ski', at('cruiser'))!, /Level 5|swim platform/)
})

test("room on deck is respected: nothing overlaps, and what doesn't fit is refused", () => {
  // a cruiser's aft deck takes one hot tub (2 rows) and some small gear, never a pool
  assert.equal(allocate('cruiser', ['fun:hot-tub']).problems.length, 0)
  assert.equal(allocate('grand', ['fun:pool', 'fun:hot-tub']).problems.length, 0)
  assert.equal(allocate('launch', ['fun:pool']).problems.length, 1) // 3 rows on a 2-row aft deck
  // fill the skiff's aft deck (2 spots) and a third aft item has nowhere to go
  const { problems } = allocate('skiff', ['deck:crate', 'deck:tackle', 'engine:fuel-tank'])
  assert.equal(problems.length, 0) // crate and tackle spill to the foredeck
  assert.ok(allocate('skiff', ['deck:crate', 'deck:tackle', 'engine:fuel-tank', 'decor:chest', 'decor:traps']).problems.length >= 1)
  // spots never collide
  const { placements } = allocate('grand', ['fun:pool', 'fun:hot-tub', 'fun:grill', 'fun:palms', 'deck:crate', 'deck:tackle', 'fun:loungers', 'fun:garden', 'deck:radar', 'fun:jet-ski', 'decor:lantern', 'deck:ladder'])
  const cells = new Set<string>()
  for (const [id, p] of Object.entries(placements))
    for (let r = p.row; r < p.row + p.rows; r++)
      for (const l of p.lane === null ? [0, 1] : [p.lane]) {
        const key = `${p.zone}:${r}:${l}`
        assert.ok(!cells.has(key), `${id} overlaps at ${key}`)
        cells.add(key)
      }
})

test('fitting and removing: removing keeps it owned; a smaller level takes off what no longer fits, and says what', () => {
  const g = at('grand', ['fun:pool', 'fun:garden', 'fun:slide', 'fun:hot-tub'])
  assert.deepEqual(new Set(accessoriesOf(g)), new Set(['fun:pool', 'fun:garden', 'fun:slide', 'fun:hot-tub']))
  assert.ok(!accessoriesOf(removeAccessory(g, 'fun:pool').config).includes('fun:pool'))
  const down = setStage(g, 'cruiser')
  assert.ok(!accessoriesOf(down.config).includes('fun:pool') && !accessoriesOf(down.config).includes('fun:slide'))
  assert.ok(down.removed.includes('Pool') && down.removed.includes('Water slide'), down.removed.join())
})

test('level prices: parts already bought count toward the level that includes them, and nothing goes below a credit', () => {
  assert.equal(stagePrice('launch', []), 12)
  assert.ok(stagePrice('console', ['helm:center', 'top:poles', 'top:hardtop']) < 25)
  assert.ok(stagePrice('cruiser', ['engine:twin']) < 40)
  const every = STAGES.cruiser.parts.concat(STAGES.console.parts)
  assert.ok(stagePrice('cruiser', every) >= 1)
})

test('5,000 random builds (any level, any accessories) settle into a boat that fits, with a sane layout', () => {
  let seed = 11
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  for (let i = 0; i < 5000; i++) {
    const stage = STAGE_IDS[Math.floor(rand() * STAGE_IDS.length)]
    const pick = ACCESSORY_IDS.filter(() => rand() < 0.4)
    const { config } = settle({ ...base, details: { ...base.details, stage, parts: pick } })
    assert.deepEqual(buildProblems(config), [], `${stage}: ${pick.join()}`)
    const spec = specOf(config)
    assert.ok([spec.lift, spec.dims.top, spec.dims.length, ...spec.mounts.roller].every(Number.isFinite))
    assert.ok(vesselConfigSchema.safeParse(config).success)
  }
})

test('matte black is free from the start, at any level', () => {
  const B = '#000000'
  const c = { ...at('grand'), hullColor: B, trimColor: B, accentColor: B, details: { ...at('grand').details, finish: 'matte' as const, deckColor: B, cabinColor: B, roofColor: B } }
  assert.ok(equippedItems(c).filter((id) => !id.startsWith('stage:')).every((id) => FREE_ITEMS.includes(id as ItemId)))
})

test('nobody realistically has everything: levels and accessories cost far more than anyone has earned', () => {
  const total = ITEM_IDS.filter((id) => isLive(id) && (id.startsWith('stage:') || itemDef(id).custom)).reduce((n, id) => n + (itemDef(id).price.kind === 'credits' ? (itemDef(id).price as { credits: number }).credits : 0), 0)
  assert.ok(total > 3 * 117, `total ${total}`)
  console.log(`    (every level and live accessory: ${total} credits)`)
})

test('saved boats are kept: heritage boats untouched, anything stored that no longer fits comes off rather than resetting', () => {
  const lobster: VesselConfig = { ...base, vesselClass: 'lobster', accessories: ['ensign'], details: {} }
  assert.equal(specOf(lobster), VESSEL_CLASS_SPECS.lobster)
  assert.deepEqual(readVessel(lobster), lobster)
  // a boat saved by the parts-based Garage (structure stored with its accessories): the structure comes from its level
  const old = { ...base, hullColor: '#000000', details: { parts: ['hull:cruiser', 'helm:nav', 'decor:ensign', 'fun:pool'] } }
  const read = readVessel(old)!
  assert.equal(read.hullColor, '#000000')
  assert.deepEqual(accessoriesOf(read), ['decor:ensign'])
  assert.equal(stageOf(read), 'skiff')
})

console.log(`rules: ${passed} passed`)
