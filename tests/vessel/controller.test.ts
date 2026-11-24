// The controller sails boats by their stats: draft keeps a deep keel out of the shallows, range keeps a skiff near
// the harbor, and a bow thruster turns her at a standstill. The real stepVessel, with a player at the helm.
import assert from 'node:assert/strict'
import { defaultVesselConfig, StageId } from '@/lib/vessel/catalog'
import { fitAccessory, setStage } from '@/lib/vessel/items'
import { identityOf } from '@/lib/harbor/identity'
import { createStore, createVessel } from '@/lib/harbor/store'
import { stepVessel } from '@/lib/harbor/vessel/motion'
import { seabed } from '@/lib/harbor/coast'
import { FIELD_CENTER } from '@/lib/harbor/harbor'

let passed = 0
const test = (name: string, fn: () => void) => { fn(); passed++; console.log('  ✓', name) }
const member = { id: 'm1', name: 'Test Member', company: '' }
const boat = (stage: StageId, acc: string[] = [], at = { x: 12, z: 9 }, heading = 0) => {
  let c = setStage(defaultVesselConfig('m1'), stage).config
  for (const a of acc) c = fitAccessory(c, a as never).config
  const who = identityOf(member as never, c, 0)
  const store = createStore()
  const b = createVessel({ id: 'm1', who, berth: at, plate: { x0: 0, y0: 0, x1: 0, y1: 0 }, route: null, launchAt: 0 })
  Object.assign(b, { phase: 'underway', control: 'player', x: at.x, z: at.z, heading, speed: 0 })
  b.anchor.stage = 'stowed'
  store.boats.set('m1', b)
  return { b, store, who }
}
const sail = (o: ReturnType<typeof boat>, seconds: number, throttle: number, steer = 0) => {
  o.b.helm.throttle = throttle
  o.b.helm.steer = steer
  for (let i = 0, t = 0; i < seconds * 60; i++, t += 1 / 60) stepVessel(o.b, o.store, 1e9, 1 / 60, t)
}

test('a deep keel never sails into water shallower than her draft', () => {
  // head the bluewater sloop straight at the lighthouse island's beach, full throttle, for a long while
  const o = boat('bluewater', [], { x: 10, z: 4 }, Math.atan2(-10, -4))
  let shallowest = Infinity
  o.b.helm.throttle = 1
  for (let i = 0, t = 0; i < 60 * 40; i++, t += 1 / 60) {
    stepVessel(o.b, o.store, 1e9, 1 / 60, t)
    shallowest = Math.min(shallowest, -seabed(o.b.x, o.b.z))
  }
  assert.ok(shallowest > o.who.spec.draft - 0.1, `she reached water ${shallowest.toFixed(2)} deep with a ${o.who.spec.draft.toFixed(2)} draft`)
  // while a skiff, which draws little, gets much further in toward the same beach
  const s = boat('skiff', [], { x: 10, z: 4 }, Math.atan2(-10, -4))
  let skiffShallowest = Infinity
  s.b.helm.throttle = 1
  for (let i = 0, t = 0; i < 60 * 40; i++, t += 1 / 60) {
    stepVessel(s.b, s.store, 1e9, 1 / 60, t)
    skiffShallowest = Math.min(skiffShallowest, -seabed(s.b.x, s.b.z))
  }
  assert.ok(skiffShallowest < shallowest - 0.3, `skiff ${skiffShallowest.toFixed(2)} vs sloop ${shallowest.toFixed(2)}`)
})

test('a skiff stays within her range of the harbor; a long-range yacht goes much further', () => {
  const far = (o: ReturnType<typeof boat>) => Math.hypot(o.b.x - FIELD_CENTER.x, o.b.z - FIELD_CENTER.z)
  const s = boat('skiff', [], { x: 30, z: 20 }, Math.atan2(1, 0.4))
  sail(s, 60, 1)
  assert.ok(far(s) <= s.who.spec.range + 0.2, `skiff got ${far(s).toFixed(1)} out with a range of ${s.who.spec.range.toFixed(1)}`)
  const y = boat('grand', ['perf:long-range'], { x: 30, z: 20 }, Math.atan2(1, 0.4))
  sail(y, 60, 1)
  assert.ok(far(y) > far(s) + 8, `grand ${far(y).toFixed(1)} vs skiff ${far(s).toFixed(1)}`)
})

test('a bow thruster turns her at a standstill; without one she barely turns', () => {
  const turned = (acc: string[]) => {
    const o = boat('cruiser', acc, { x: 20, z: 15 }, 0)
    sail(o, 3, 0, 1)
    return Math.abs(o.b.heading)
  }
  const plain = turned([])
  const thruster = turned(['perf:bow-thruster'])
  assert.ok(thruster > plain * 3, `thruster ${thruster.toFixed(2)} rad vs ${plain.toFixed(2)} rad`)
})

test('top speed in the water is the stat shown: a tuned engine really is faster', () => {
  const speed = (acc: string[]) => { const o = boat('cruiser', acc, { x: 20, z: 15 }, 0.5); sail(o, 20, 1); return o.b.speed }
  const plain = speed([])
  const tuned = speed(['perf:tune'])
  assert.ok(Math.abs(tuned / plain - 1.06) < 0.01, `${(tuned / plain).toFixed(3)}`)
})

console.log(`controller: ${passed} passed`)
