// Builds the CORE harbor scene from the model catalog: a sheltered bay ringed by cliffs, a village on the low shore,
// a lighthouse on the high headland, woodland on the uplands and rocks and islets off the coast.
//
//   node scripts/environment/harbor/generate.mjs                    writes the harbor's baseline and scenes/harbor-generated
//   node scripts/environment/harbor/generate.mjs --replace-working  also replaces the working scene (kept in archive/)
//   node scripts/environment/harbor/generate.mjs --dry              composes and checks, writes nothing
//   node scripts/environment/harbor/generate.mjs --preview out.png  also draws a quick picture of the result
//
// The land and the landmarks are authored below, piece by piece: where each cliff stands, which way it faces, what
// stands on it. Everything that only dresses the scene (trees, flowers, grass, boulders, fences) is scattered by rule
// from a fixed seed: each kind keeps to its ground (height, slope, distance from the shore and from a cliff's edge),
// keeps its distance from everything already placed, and gathers in clusters. The same seed gives the same harbor.
//
// Nothing is guessed about a model: each is read as the editor reads it (assets.mjs), and everything that stands on
// the land is set on the land's real surface by casting down onto it. The run ends with a check of the whole scene
// (models on disk, things floating, sunk, over water, or in each other's way) and says what it found.
//
// Composing happens in "plan" coordinates, the ground as the approved camera sees it: a runs to the right of the
// screen and d toward the camera, both in world units from the middle of the sea; a turn of 0 leaves a model as its
// top view shows it (its +x to the right, its front toward the camera), and turns run anticlockwise seen from above.

import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { baseScale, groundAt, landPiece, loadModel, modelById, rng, ROOT, worldSize } from './assets.mjs'
import { drawPreview } from './preview.mjs'

const SEED = 20261123
const CENTER = [0, -6]
// the approved view: the whole harbor, the mountain's top and the outer rocks inside the frame
const VIEW = { a: 2, d: -11, width: 128 }

const args = process.argv.slice(2)
const DRY = args.includes('--dry')
const PREVIEW = args.includes('--preview') ? args[args.indexOf('--preview') + 1] : null

const SQ = Math.SQRT1_2
const round0 = (v) => +v.toFixed(3)
const DEG = Math.PI / 180
const plan = (a, d) => [CENTER[0] + (a + d) * SQ, CENTER[1] + (d - a) * SQ]
const CAMERA = { azimuth: 45, elevation: 35, target: [round0(plan(VIEW.a, VIEW.d)[0]), 0, round0(plan(VIEW.a, VIEW.d)[1])], width: VIEW.width, aspect: 1.7747 }
const round = (v, n = 3) => +v.toFixed(n)
/** A model-space offset (x, z), turned by phi, in plan coordinates */
const turned = (x, z, phi) => {
  const c = Math.cos(phi * DEG)
  const s = Math.sin(phi * DEG)
  return [x * c + z * s, -x * s + z * c]
}

const isGroundKind = (kind) => kind === 'land' || kind === 'islet' || kind === 'path'
/** How far a model is sunk into the ground it stands on, as a share of its height (catalog.ts: SINK) */
const SINK = { land: 0, islet: 0, path: 0.05, structure: 0.02, prop: 0.06, tree: 0.03, plant: 0.12 }

const objects = []
const land = []
const placed = []
const issues = []
const counters = new Map()
const random = rng(SEED)

const nextId = (stem) => {
  const n = (counters.get(stem) ?? 0) + 1
  counters.set(stem, n)
  return `${stem}-${String(n).padStart(2, '0')}`
}
const ground = (a, d) => groundAt(land, ...plan(a, d))

/** Adds a model to the scene at plan (a, d) and height y, as given */
async function add({ id, name, model: modelId, group, a, d, y, phi = 0, scale = 1, radius }) {
  const def = modelById(modelId)
  if (!def) throw new Error(`"${modelId}" is not in the catalog`)
  const model = await loadModel(modelId, isGroundKind(def.kind) ? 'full' : 'medium')
  const sc = Array.isArray(scale) ? scale : [scale, scale, scale]
  const [x, z] = plan(a, d)
  const o = {
    id: id ?? nextId(modelId),
    name: name ?? def.name,
    model: modelId,
    group,
    position: [round(x), round(y), round(z)],
    rotation: [0, round((((45 + phi) % 360) + 360) % 360, 2), 0],
    scale: sc.map((v) => round(v, 4)),
    visible: true
  }
  objects.push(o)
  if (isGroundKind(def.kind)) land.push(landPiece(o, model))
  const size = worldSize(model)
  const p = {
    o,
    def,
    model,
    a,
    d,
    y,
    phi,
    w: size.x * sc[0],
    h: size.y * sc[1],
    depth: size.z * sc[2],
    radius: radius ?? (Math.max(size.x * sc[0], size.z * sc[2]) / 2) * 0.8
  }
  placed.push(p)
  return p
}

/** A piece of the land itself: it stands in the sea, its skirt just under the water */
const terrain = (id, model, name, a, d, phi, scale, sink = 0.35) =>
  add({ id, name, model, group: 'Terrain', a, d, y: -sink, phi, scale })

/** The ground under a footprint (w × depth, turned by phi) at n × n points: its lowest and highest, or null off the land */
function under(a, d, w, depth, phi, { on, n = 5 } = {}) {
  let lo = Infinity
  let hi = -Infinity
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      const [oa, od] = turned((i / (n - 1) - 0.5) * w, (j / (n - 1) - 0.5) * depth, phi)
      const g = ground(a + oa, d + od)
      if (!g || (on && !on.includes(g.piece.o.id))) return null
      lo = Math.min(lo, g.y)
      hi = Math.max(hi, g.y)
    }
  return { lo, hi, spread: hi - lo }
}

/**
 * The flattest place for a footprint within reach of a spot: where an authored landmark actually goes. Composing
 * names the ledge and roughly where on it; this finds the ground that takes the building.
 */
function findSite({ near: [a0, d0], within = 3, size: [w, depth], phi = 0, on, level }) {
  let best = null
  for (let da = -within; da <= within; da += 0.5)
    for (let dd = -within; dd <= within; dd += 0.5) {
      const far = Math.hypot(da, dd)
      if (far > within) continue
      const u = under(a0 + da, d0 + dd, w, depth, phi, { on })
      if (!u || (level && (u.lo < level[0] || u.hi > level[1]))) continue
      const score = u.spread + far * 0.04
      if (!best || score < best.score) best = { a: a0 + da, d: d0 + dd, score, ...u }
    }
  return best
}

// everything placed that isn't land keeps others off its ground: buildings and paving by their footprint, the rest
// by a circle
const keepOff = []
function blocked(a, d, r) {
  for (const k of keepOff) {
    if (k.rect) {
      // into the footprint's own axes
      const c = Math.cos(k.phi * DEG)
      const s = Math.sin(k.phi * DEG)
      const da = a - k.a
      const dd = d - k.d
      const x = da * c - dd * s
      const z = da * s + dd * c
      if (Math.abs(x) < k.hx + r && Math.abs(z) < k.hz + r) return true
    } else if (Math.hypot(a - k.a, d - k.d) < k.r + r) return true
  }
  return false
}

/**
 * Stands a model on the land at plan (a, d): set on the lowest ground under its footprint (a share of its box: models
 * carry skirts of grass that overhang), so no corner hangs in the air, and sunk a little as its kind is. With `find`
 * the spot is the flattest within that reach. Ground that falls away under it by more than `tolerance` is reported.
 */
async function seat({ model: modelId, a, d, phi = 0, scale = 1, footprint = 0.72, tolerance = 0.7, sink, lift = 0, find, on, level, clear = 0.4, ...rest }) {
  const def = modelById(modelId)
  const model = await loadModel(modelId, isGroundKind(def.kind) ? 'full' : 'medium')
  const sc = Array.isArray(scale) ? scale : [scale, scale, scale]
  const size = worldSize(model)
  const w = size.x * sc[0] * footprint
  const depth = size.z * sc[2] * footprint
  const label = rest.id ?? rest.name ?? modelId
  if (find) {
    const site = findSite({ near: [a, d], within: find, size: [w, depth], phi, on, level })
    if (!site) {
      // say what is there, to compose by
      const any = findSite({ near: [a, d], within: find + 2, size: [w, depth], phi })
      issues.push(
        `${label}: no ground for it within ${find} of (${a}, ${d})` +
          (any ? `; the flattest within ${find + 2} is (${any.a}, ${any.d}), ${any.lo.toFixed(2)} to ${any.hi.toFixed(2)}, on ${ground(any.a, any.d).piece.o.id}` : '')
      )
      return null
    }
    a = site.a
    d = site.d
  }
  const u = under(a, d, w, depth, phi, { n: 5 })
  if (!u) {
    issues.push(`${label}: part of its footprint at (${a}, ${d}) is over open water`)
    return null
  }
  if (u.spread > tolerance) issues.push(`${label}: the ground under it varies by ${u.spread.toFixed(2)} (${u.lo.toFixed(2)} to ${u.hi.toFixed(2)})`)
  const y = u.lo - size.y * sc[1] * (sink ?? SINK[def.kind]) + lift
  const p = await add({ model: modelId, a, d, y, phi, scale, ...rest })
  p.ground = u
  keepOff.push({ rect: true, a, d, phi, hx: (size.x * sc[0]) / 2 + clear - 0.4, hz: (size.z * sc[2]) / 2 + clear - 0.4, of: p })
  return p
}

/**
 * Stairs between two ledges, found rather than placed: every way down from the upper ledge within reach of `near` is
 * tried (where they'd arrive, which way they'd run) with the model scaled as a whole until its rise matches the drop,
 * never stretched. A fit has to arrive on level ground with room behind it, land on level ground with room ahead, pass
 * over the slope between without being buried in it, and stay near the model's own size; the best is built.
 */
async function fitStairs({ id, name, models = ['stone-stairs-wide', 'cliff-stairs'], upper, lower, near: [a0, d0], within = 5, group = 'Paths and stairs', sizes = [0.75, 1.45], landing = 1 }) {
  const overlap = 0.1
  const okOn = (g, ledge) => g && ledge.on.includes(g.piece.o.id) && g.y >= ledge.level[0] && g.y <= ledge.level[1] && g.slope < 20
  let best = null
  // why the ways tried failed, for the report when none works
  const why = { 'no room behind the top': 0, 'no level ground at the foot': 0, 'wrong size for the drop': 0, 'no room ahead of the foot': 0, 'buried in the slope': 0, 'in the way of something': 0 }
  for (const modelId of models) {
  const model = await loadModel(modelId, 'full')
  const size = worldSize(model)
  for (let da = -within; da <= within; da += 0.5)
    for (let dd = -within; dd <= within; dd += 0.5) {
      if (Math.hypot(da, dd) > within) continue
      const ta = a0 + da
      const td = d0 + dd
      const top = ground(ta, td)
      if (!okOn(top, upper)) continue
      for (let turn = 0; turn < 360; turn += 15) {
        const dir = [Math.cos(turn * DEG), Math.sin(turn * DEG)]
        const behind = ground(ta - dir[0] * 1.2, td - dir[1] * 1.2)
        if (!behind || Math.abs(behind.y - top.y) > 0.45) {
          why['no room behind the top']++
          continue
        }
        // the size at which its rise is the drop to where its foot comes down
        let s = 1
        let foot = null
        for (let k = 0; k < 6; k++) {
          const reach = size.z * s * (1 - overlap)
          foot = ground(ta + dir[0] * reach, td + dir[1] * reach)
          if (!foot) break
          s = (top.y - foot.y) / (size.y * 0.93)
        }
        if (!okOn(foot, lower)) {
          why['no level ground at the foot']++
          continue
        }
        if (s < sizes[0] || s > sizes[1]) {
          why['wrong size for the drop']++
          continue
        }
        const reach = size.z * s * (1 - overlap)
        const ahead = ground(ta + dir[0] * (reach + landing), td + dir[1] * (reach + landing))
        if (!ahead || Math.abs(ahead.y - foot.y) > 0.5) {
          why['no room ahead of the foot']++
          continue
        }
        // the slope under them: never above the treads, across their width
        let buried = 0
        for (const t of [0.2, 0.4, 0.6, 0.8])
          for (const side of [-0.3, 0, 0.3]) {
            const oa = ta + dir[0] * reach * t - dir[1] * size.x * s * side
            const od = td + dir[1] * reach * t + dir[0] * size.x * s * side
            const g = ground(oa, od)
            buried = Math.max(buried, (g?.y ?? 0) - (top.y - (top.y - foot.y) * t))
          }
        if (buried > 0.8) {
          why['buried in the slope']++
          continue
        }
        const mid = size.z * s * (0.5 - overlap)
        if (blocked(ta + dir[0] * mid, td + dir[1] * mid, 1.5) || blocked(ta + dir[0] * (reach + 1), td + dir[1] * (reach + 1), 0.6)) {
          why['in the way of something']++
          continue
        }
        const score = Math.abs(s - 1) + Math.hypot(da, dd) * 0.06 + Math.max(0, buried) * 0.6
        if (!best || score < best.score) best = { score, ta, td, dir, s, top, foot, modelId, size }
      }
    }
  }
  if (!best)
    return issues.push(
      `${id}: no way down from ${upper.on} to ${lower.on} within ${within} of (${a0}, ${d0}) takes the stairs (${Object.entries(why).filter(([, n]) => n).map(([k, n]) => `${k}: ${n}`).join(', ') || 'no ground of the upper ledge there'})`
    )
  const { ta, td, dir, s, foot, modelId, size } = best
  // the model climbs toward its own -z: its +z is the way down
  const phi = Math.atan2(dir[0], dir[1]) / DEG
  const mid = size.z * s * (0.5 - overlap)
  const p = await add({ id, name, model: modelId, group, a: ta + dir[0] * mid, d: td + dir[1] * mid, y: foot.y - size.y * s * 0.05, phi, scale: round(s, 3) })
  p.fit = best
  keepOff.push({ rect: true, a: p.a, d: p.d, phi, hx: (size.x * s) / 2, hz: (size.z * s) / 2 + 0.8, of: p })
  return p
}

// a smooth field of noise over the plan: where it's high, things gather; where it's low, they leave a clearing
function clumps(label, scale) {
  const seed = [...label].reduce((h, ch) => Math.imul(h ^ ch.charCodeAt(0), 0x01000193) >>> 0, SEED)
  const hash = (i, j) => {
    let h = (Math.imul(i, 374761393) ^ Math.imul(j, 668265263) ^ seed) >>> 0
    h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296
  }
  const ease = (t) => t * t * (3 - 2 * t)
  return (a, d) => {
    const x = a / scale
    const y = d / scale
    const i = Math.floor(x)
    const j = Math.floor(y)
    const fx = ease(x - i)
    const fy = ease(y - j)
    return (hash(i, j) * (1 - fx) + hash(i + 1, j) * fx) * (1 - fy) + (hash(i, j + 1) * (1 - fx) + hash(i + 1, j + 1) * fx) * fy
  }
}

/**
 * Scatters models over the tops of the named landforms. A place is taken only if it's that landform's own ground,
 * level enough, within the heights given, with the same ground all round it (so nothing stands half over a cliff's
 * edge), clear of every building, path and earlier planting, and inside a clump of the noise.
 */
async function scatter(label, { group, on, count, models, level = [1.2, 99], slope = 32, spacing = 2, edge = 0.9, clump, shore, where }) {
  const rand = random.fork(label)
  const field = clump ? clumps(label, clump.scale) : null
  // the ground to try: the plan box round the landforms
  let a0 = Infinity
  let a1 = -Infinity
  let d0 = Infinity
  let d1 = -Infinity
  for (const p of placed) {
    if (!on.includes(p.o.id)) continue
    const r = Math.hypot(p.w, p.depth) / 2
    a0 = Math.min(a0, p.a - r)
    a1 = Math.max(a1, p.a + r)
    d0 = Math.min(d0, p.d - r)
    d1 = Math.max(d1, p.d + r)
  }
  const total = models.reduce((n, m) => n + m[1], 0)
  let made = 0
  for (let tries = 0; tries < count * 4000 && made < count; tries++) {
    const a = rand.range(a0, a1)
    const d = rand.range(d0, d1)
    // every draw is made whatever happens to the place, so one rejection doesn't reshuffle all that follow
    let pick = rand() * total
    const spec = models.find((m) => (pick -= m[1]) < 0) ?? models[0]
    const scale = round(rand.range(spec[2] ?? 0.9, spec[3] ?? 1.15), 3)
    const phi = round(rand.range(0, 360), 1)
    const keep = rand()
    if (where && !where(a, d)) continue
    if (field && field(a, d) < clump.cut + keep * 0.12) continue
    const g = ground(a, d)
    if (!g || !on.includes(g.piece.o.id) || g.slope > slope || g.y < level[0] || g.y > level[1]) continue
    if (shore && (shoreDistance(a, d) < shore[0] || shoreDistance(a, d) > shore[1])) continue
    let firm = true
    for (let k = 0; k < 6 && firm; k++) {
      const ring = ground(a + Math.cos((k * Math.PI) / 3) * edge, d + Math.sin((k * Math.PI) / 3) * edge)
      firm = !!ring && Math.abs(ring.y - g.y) < 0.9
    }
    if (!firm || blocked(a, d, spacing / 2)) continue
    const def = modelById(spec[0])
    const model = await loadModel(spec[0], 'medium')
    const size = worldSize(model)
    // set by its foot (a leaning tree's trunk is off the middle of its box)
    const bs = baseScale(model) * scale
    const [fa, fd] = turned(model.foot.x * bs, model.foot.z * bs, phi)
    const y = g.y - size.y * scale * SINK[def.kind]
    const p = await add({ id: nextId(spec[4] ?? spec[0]), model: spec[0], group, a: a - fa, d: d - fd, y, phi, scale, radius: spacing / 2 })
    p.foot = [a, d]
    keepOff.push({ a, d, r: spacing / 2, of: p })
    made++
  }
  if (made < count) issues.push(`${label}: room for only ${made} of ${count}`)
  return made
}

// how far a plan point is from the water's edge (on land) or from the land (at sea), from a map of the coast
let coast = null
function mapCoast() {
  const A = 70
  const D = 66
  const cols = A * 2
  const rows = D * 2
  const isLand = new Uint8Array(cols * rows)
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++) {
      const g = ground(-A + i + 0.5, -D + j + 0.5)
      if (g && g.y > 0.05) isLand[j * cols + i] = 1
    }
  const dist = new Float32Array(cols * rows).fill(1e9)
  const queue = []
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++) {
      const k = j * cols + i
      const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([di, dj]) => {
        const ni = i + di
        const nj = j + dj
        return ni >= 0 && nj >= 0 && ni < cols && nj < rows && isLand[nj * cols + ni] !== isLand[k]
      })
      if (edge) {
        dist[k] = 0.5
        queue.push(k)
      }
    }
  for (let q = 0; q < queue.length; q++) {
    const k = queue[q]
    const i = k % cols
    const j = (k - i) / cols
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ni = i + di
      const nj = j + dj
      if (ni < 0 || nj < 0 || ni >= cols || nj >= rows) continue
      const nk = nj * cols + ni
      if (dist[nk] > dist[k] + 1) {
        dist[nk] = dist[k] + 1
        queue.push(nk)
      }
    }
  }
  coast = { A, D, cols, rows, isLand, dist }
}
function shoreDistance(a, d) {
  const i = Math.floor(a + coast.A)
  const j = Math.floor(d + coast.D)
  if (i < 0 || j < 0 || i >= coast.cols || j >= coast.rows) return 99
  return coast.dist[j * coast.cols + i]
}
const atSea = (a, d) => {
  const i = Math.floor(a + coast.A)
  const j = Math.floor(d + coast.D)
  return i < 0 || j < 0 || i >= coast.cols || j >= coast.rows || !coast.isLand[j * coast.cols + i]
}

/** The brow of a ledge: from a point on it, out along each bearing to where its ground ends, and back in by `inset` */
function brow({ center: [ca, cd], on, level, from, to, step = 5, inset = 1.1 }) {
  const points = []
  for (let t = from; t <= to; t += step) {
    const dir = [Math.cos(t * DEG), -Math.sin(t * DEG)]
    let r = 0
    for (; r < 40; r += 0.25) {
      const g = ground(ca + dir[0] * (r + 0.25), cd + dir[1] * (r + 0.25))
      if (!g || !on.includes(g.piece.o.id) || g.y < level[0] || g.y > level[1]) break
    }
    if (r > inset + 0.5) points.push([ca + dir[0] * (r - inset), cd + dir[1] * (r - inset)])
  }
  return points
}

/** A line's points again, a fixed distance apart along it */
function spaced(points, step) {
  const out = [points[0]]
  let carry = 0
  for (let i = 0; i + 1 < points.length; i++) {
    const [a0, d0] = points[i]
    const [a1, d1] = points[i + 1]
    const len = Math.hypot(a1 - a0, d1 - d0)
    let t = step - carry
    for (; t <= len; t += step) out.push([a0 + ((a1 - a0) * t) / len, d0 + ((d1 - d0) * t) / len])
    carry = len - (t - step)
  }
  return out
}

/** A fence along a line: a piece for each stretch of it that's on the ledge and clear of what's already there */
async function fence(stem, name, group, points, { scale = 1, on } = {}) {
  const model = await loadModel('fence-straight', 'medium')
  const size = worldSize(model)
  const line = spaced(points, size.x * scale * 0.96)
  let k = 0
  for (let i = 0; i + 1 < line.length; i++) {
    const a = (line[i][0] + line[i + 1][0]) / 2
    const d = (line[i][1] + line[i + 1][1]) / 2
    const phi = Math.atan2(-(line[i + 1][1] - line[i][1]), line[i + 1][0] - line[i][0]) / DEG
    const u = under(a, d, size.x * scale * 0.8, size.z * scale * 0.5, phi, { n: 3, on })
    if (!u || u.spread > 0.8 || blocked(a, d, 0.7)) continue
    const p = await add({ id: nextId(stem), name: `${name} ${++k}`, model: 'fence-straight', group, a, d, y: u.lo - size.y * scale * SINK.prop, phi, scale })
    keepOff.push({ rect: true, a, d, phi, hx: (size.x * scale) / 2, hz: 0.5, of: p })
  }
  return k
}

/** Rocks and islets in the sea round the coast: off the land, out of the bay's open water, apart from each other */
async function offshore(label, { group, count, models, shore, spacing, where }) {
  const rand = random.fork(label)
  const field = clumps(label, 14)
  const total = models.reduce((n, m) => n + m[1], 0)
  let made = 0
  for (let tries = 0; tries < count * 300 && made < count; tries++) {
    const a = rand.range(-64, 68)
    const d = rand.range(-62, 50)
    let pick = rand() * total
    const spec = models.find((m) => (pick -= m[1]) < 0) ?? models[0]
    const scale = round(rand.range(spec[2], spec[3]), 3)
    const phi = round(rand.range(0, 360), 1)
    const keep = rand()
    if (Math.abs(a) + Math.abs(d) > 84 || !atSea(a, d)) continue
    const off = shoreDistance(a, d)
    if (off < shore[0] || off > shore[1] || (where && !where(a, d))) continue
    if (field(a, d) < 0.35 + keep * 0.2) continue
    const size = worldSize(await loadModel(spec[0], 'full'))
    const r = (Math.max(size.x, size.z) * scale) / 2
    if (off < r * 0.8 || blocked(a, d, r + spacing)) continue
    const p = await add({ id: nextId(spec[4] ?? spec[0]), model: spec[0], group, a, d, y: -0.3, phi, scale })
    keepOff.push({ a, d, r, of: p })
    made++
  }
  if (made < count) issues.push(`${label}: room for only ${made} of ${count}`)
}

// ───────────────────────────────────────────── the land ─────────────────────────────────────────────
//
// One horseshoe of land round a bay that opens toward the camera. From the west point round to the east: the low
// village shore under its terrace and the west upland, the mountain behind them, the cove with its beach at the head
// of the bay, the lighthouse head, the east point below it, and the mole that closes the bay. The sea arch stands
// off the west point, at the harbor's mouth.

await terrain('mountain', 'mountain-rounded', 'The mountain', -8, -31, 0, 2.6)
await terrain('west-upland', 'rock-steps', 'West upland', -33, -9, -60, 2.4)
await terrain('village-terrace', 'cliff-plateau', 'Village terrace', -22, -15, 100, 1.8)
await terrain('village-shore', 'ridge-long', 'Village shore', -13, -5, 45, 3.4)
await terrain('cove', 'cliff-concave', 'The cove', 17, -14, -30, 3)
await terrain('lighthouse-head', 'cliff-plateau', 'Lighthouse head', 41, -2, -45, 2.4)
await terrain('east-point', 'shore-rock-islet', 'East point', 37, 20, -70, 2.2)
await terrain('east-mole', 'ridge-long', 'East mole', 21, 30, 25, 2.6)
await terrain('sea-arch', 'cliff-arch', 'The sea arch', -32, 22, 15, 2.4)

mapCoast()

// ───────────────────────────────────────────── landmarks ─────────────────────────────────────────────
//
// Authored: what stands where, and which way it faces. Buildings stand square to the world (a turn of ±45 in plan),
// so the camera sees a front and a side of each: those west of the bay face south-east across it, those east of it
// south-west. Each is given its ledge and roughly where on it; it's set on the flattest ground there that takes it.

const WEST = 45
const EAST = -45

// the lighthouse on the seaward brow of the head, its keeper's cottage behind it
await seat({ id: 'lighthouse', name: 'Lighthouse', model: 'lighthouse', group: 'Lighthouse head', a: 44, d: 2, phi: EAST, scale: 1.1, find: 3, on: ['lighthouse-head'], level: [11, 13.2], footprint: 0.85 })
await seat({ id: 'keepers-cottage', name: "Keeper's cottage", model: 'keepers-cottage', group: 'Lighthouse head', a: 38, d: -3, phi: EAST, find: 3, on: ['lighthouse-head'], level: [11, 13.2] })

// the village: the harbor house on the low shore, cabins on the shelf above it, a cottage on the terrace behind
await seat({ id: 'harbor-house', name: 'Harbor house', model: 'stone-house', group: 'Village', a: -23.2, d: 5.3, phi: WEST, find: 2, on: ['village-shore'], level: [2.5, 3.9] })
await seat({ id: 'shelf-cabin', name: 'Shelf cabin', model: 'stone-cabin', group: 'Village', a: -9.7, d: -10.2, phi: WEST, find: 2, on: ['village-shore'], level: [5, 6.6] })
await seat({ id: 'net-cabin', name: 'Cabin at the head of the shore', model: 'stone-cabin', group: 'Village', a: -2.7, d: -16.7, phi: WEST, find: 2, on: ['village-shore'], level: [4.2, 5.8] })
await seat({ id: 'terrace-cottage', name: 'Terrace cottage', model: 'keepers-cottage', group: 'Village', a: -23, d: -17, phi: WEST, find: 2, on: ['village-terrace'], level: [8, 9.5] })

// above the beach, and out along the east shore
await seat({ id: 'cove-house', name: 'House above the cove', model: 'stone-house', group: 'The cove', a: 20.4, d: -23.1, phi: EAST, find: 2, on: ['cove'], level: [7, 8.6] })
await seat({ id: 'point-cabin', name: 'Cabin on the east point', model: 'stone-cabin', group: 'East shore', a: 36.2, d: 17.7, phi: EAST, find: 2, on: ['east-point'], level: [8.6, 10.4] })
await seat({ id: 'mole-cabin', name: 'Cabin on the mole', model: 'stone-cabin', group: 'East shore', a: 17.8, d: 32.3, phi: EAST, find: 2, on: ['east-mole'], level: [3.4, 5] })

// the ways between the levels
await fitStairs({ id: 'shore-stairs', name: 'Stairs to the low shore', upper: { on: ['village-shore'], level: [5, 6.6] }, lower: { on: ['village-shore'], level: [2.5, 3.9] }, near: [-16.5, 0] })
await fitStairs({ id: 'terrace-stairs', name: 'Stairs to the terrace', upper: { on: ['village-terrace'], level: [7.6, 9.4] }, lower: { on: ['village-shore', 'village-terrace'], level: [2.5, 6.6] }, near: [-17, -12], within: 7, sizes: [0.75, 1.6] })
await fitStairs({ id: 'beach-stairs', name: 'Stairs to the beach', landing: 0.6, upper: { on: ['cove', 'village-shore'], level: [2.6, 5.4] }, lower: { on: ['cove'], level: [0.3, 1.6] }, near: [9, -14], within: 6, sizes: [0.75, 1.7] })

// paving where people walk: at the head of each flight of stairs, and before the doors
await seat({ id: 'terrace-path', name: 'Path on the terrace', model: 'path-straight', group: 'Paths and stairs', a: -18.5, d: -15.5, phi: 20, find: 2, on: ['village-terrace'], level: [8, 9.4], sink: 0.45, tolerance: 0.5 })
await seat({ id: 'shelf-path', name: 'Path on the shelf', model: 'path-straight', group: 'Paths and stairs', a: -14.5, d: -2, phi: WEST, find: 2, on: ['village-shore'], level: [5, 6.6], sink: 0.45, tolerance: 0.6 })
await seat({ id: 'head-path', name: 'Path to the lighthouse', model: 'path-curve-left', group: 'Paths and stairs', a: 40.5, d: 4.5, phi: EAST, find: 2.5, on: ['lighthouse-head'], level: [11, 13.2], sink: 0.45, tolerance: 0.5 })

// a lookout where the mole ends, and a wall at the back of the low shore
await seat({ id: 'mole-lookout', name: 'Lookout on the mole', model: 'fence-corner', group: 'East shore', a: 10.3, d: 34.8, phi: EAST, find: 2.5, on: ['east-mole'], level: [1.6, 3], sink: 0.3 })
await seat({ id: 'shelf-wall', name: 'Wall on the shelf', model: 'stone-retaining-wall', group: 'Village', a: -12.5, d: -6, phi: WEST, find: 2.5, on: ['village-shore'], level: [4.6, 6.6], sink: 0.2, tolerance: 0.9 })

// fences along the brows people stand at
await fence('head-fence', 'Fence on the head', 'Lighthouse head', brow({ center: [41, -1], on: ['lighthouse-head'], level: [11, 13.2], from: -115, to: 65 }), { on: ['lighthouse-head'] })
await fence('terrace-fence', 'Fence on the terrace', 'Village', brow({ center: [-22, -17], on: ['village-terrace'], level: [8, 9.5], from: -165, to: -15 }), { on: ['village-terrace'] })
await fence('shelf-fence', 'Fence on the shelf', 'Village', brow({ center: [-14.5, -2], on: ['village-shore'], level: [5, 6.6], from: -110, to: -10, inset: 0.9 }), { on: ['village-shore'] })
await fence('cove-fence', 'Fence above the cove', 'The cove', brow({ center: [20.4, -23.1], on: ['cove'], level: [7, 8.6], from: -150, to: -30, inset: 0.9 }), { on: ['cove'] })

// ───────────────────────────────────────────── dressing ─────────────────────────────────────────────
//
// Scattered by rule. Each landform has its own planting: pine forest on the mountain and the upland, garden trees
// round the village, wind-bent pines on the exposed points, flowers on the grass by the houses, beach grass on the
// sand; rocks and islets stand off the coast, clear of the open water of the bay.

const PINES = [['white-pine-tall', 3, 0.9, 1.3], ['white-pine-medium', 3, 0.9, 1.25], ['pine-narrow-spire', 2, 0.9, 1.3], ['white-pine-small', 2, 0.85, 1.2]]
await scatter('mountain forest', { group: 'Woodland', on: ['mountain'], count: 40, models: PINES, level: [5, 30], spacing: 2.2 })
await scatter('upland forest', { group: 'Woodland', on: ['west-upland'], count: 16, models: [...PINES, ['coastal-oak-rounded', 2, 0.95, 1.25]], level: [6, 20], spacing: 2.3 })
await scatter('terrace garden', { group: 'Village', on: ['village-terrace'], count: 6, models: [['coastal-oak-rounded', 3, 0.9, 1.15], ['oak-twin-trunk', 1, 0.85, 1], ['white-pine-small', 1, 0.9, 1.1]], level: [2.6, 9.5], spacing: 3 })
await scatter('shore trees', { group: 'Village', on: ['village-shore'], count: 7, models: [['coastal-oak-rounded', 2, 0.85, 1.1], ['coastal-oak-leaning', 1, 0.8, 1], ['white-pine-small', 1, 0.9, 1.1]], level: [2.6, 7], spacing: 3 })
await scatter('cove trees', { group: 'The cove', on: ['cove'], count: 11, models: [['coastal-oak-leaning', 2, 0.85, 1.1], ['coastal-oak-rounded', 2, 0.9, 1.2], ['white-pine-medium', 2, 0.9, 1.2], ['pine-windswept', 1, 0.9, 1.2]], level: [2.6, 9], spacing: 2.8 })
await scatter('head trees', { group: 'Lighthouse head', on: ['lighthouse-head'], count: 8, models: [['pine-windswept', 2, 1, 1.3], ['coastal-oak-rounded', 1, 0.9, 1.1], ['white-pine-medium', 2, 0.9, 1.2]], level: [3.5, 13.2], spacing: 3.2 })
await scatter('point pines', { group: 'East shore', on: ['east-point', 'east-mole'], count: 9, models: [['pine-windswept', 3, 0.9, 1.3], ['white-pine-medium', 2, 0.9, 1.15], ['white-pine-small', 2, 0.85, 1.1]], level: [1.8, 11], spacing: 3 })
await scatter('arch pines', { group: 'Islets and rocks', on: ['sea-arch'], count: 3, models: [['pine-windswept', 1, 1, 1.3]], level: [5, 9], spacing: 4 })

const GRASSLAND = ['village-terrace', 'village-shore', 'lighthouse-head', 'cove', 'east-point', 'east-mole', 'west-upland', 'mountain']
await scatter('flowers', { group: 'Flowers and grasses', on: GRASSLAND, count: 46, models: [['purple-coastal-flowers', 1, 0.8, 1.15]], level: [2.2, 30], spacing: 1.5, edge: 0.7, clump: { scale: 6, cut: 0.42 } })
await scatter('moss', { group: 'Flowers and grasses', on: ['mountain', 'west-upland', 'cove', 'lighthouse-head'], count: 10, models: [['hanging-moss', 1, 0.8, 1.2]], level: [2.2, 30], spacing: 2.4, edge: 0.9 })
await scatter('beach grass', { group: 'Flowers and grasses', on: ['cove'], count: 12, models: [['beach-grass-green', 1, 0.8, 1.15], ['beach-grass-plumes', 1, 0.8, 1.15]], level: [0.35, 1.9], spacing: 1.3, edge: 0.5 })
await scatter('shore grass', { group: 'Flowers and grasses', on: ['east-mole', 'village-shore', 'east-point', 'lighthouse-head'], count: 20, models: [['beach-grass-green', 1, 0.8, 1.15], ['beach-grass-plumes', 1, 0.8, 1.15]], level: [1.2, 7.4], spacing: 1.5, edge: 0.6, clump: { scale: 5, cut: 0.4 } })

// the islets: authored, one in the harbor's mouth and the rest framing the view
for (const [id, model, name, a, d, phi, scale] of [
  ['mouth-islet', 'wooded-coastal-islet', 'Islet in the harbor mouth', -7, 33, 20, 1.5],
  ['west-islet', 'mixed-trees-islet', 'West islet', -53, -1, 40, 1.8],
  ['north-west-islet', 'pine-flower-islet', 'North-west islet', -44, -33, 100, 1.7],
  ['north-east-islet', 'wooded-granite-islet', 'North-east islet', 30, -39, -30, 1.8],
  ['east-islet', 'pine-flower-islet', 'East islet', 58, 21, 200, 1.9],
  ['south-east-islet', 'mixed-trees-islet', 'South-east islet', 45, 40, 150, 1.6],
  ['south-west-islet', 'low-shrub-islet', 'South-west islet', -40, 41, 0, 1.7]
]) {
  const p = await add({ id, name, model, group: 'Islets and rocks', a, d, y: -0.3, phi, scale })
  keepOff.push({ a, d, r: p.radius, of: p })
}
mapCoast()

// the bay's open water, kept clear
const inBay = (a, d) => ((a - 9) / 21) ** 2 + ((d - 9) / 17) ** 2 < 1
await offshore('skerries', { group: 'Islets and rocks', count: 30, models: [['granite-rock-islet-bare', 1, 0.6, 1.5, 'skerry']], shore: [2.5, 13], spacing: 2.5, where: (a, d) => !inBay(a, d) })

for (const p of placed) if (p.ground) console.log(`  ${p.o.id.padEnd(18)} at (${p.a.toFixed(1)}, ${p.d.toFixed(1)}) on ${p.ground.lo.toFixed(2)}–${p.ground.hi.toFixed(2)}`)
for (const p of placed) if (p.fit) console.log(`  ${p.o.id.padEnd(18)} from (${p.fit.ta.toFixed(1)}, ${p.fit.td.toFixed(1)}) ${p.fit.top.y.toFixed(2)} down to ${p.fit.foot.y.toFixed(2)}, toward (${p.fit.dir[0].toFixed(2)}, ${p.fit.dir[1].toFixed(2)}), size ${p.o.scale[0]}`)

// ───────────────────────────────────────────── the check ─────────────────────────────────────────────

const byModel = new Map()
for (const o of objects) byModel.set(o.model, (byModel.get(o.model) ?? 0) + 1)
console.log(`${objects.length} objects, ${byModel.size} models`)
for (const [m, n] of [...byModel].sort((x, y) => y[1] - x[1])) console.log(`  ${String(n).padStart(4)} × ${m}`)
if (issues.length) {
  console.log(`\n${issues.length} to look at:`)
  for (const i of issues) console.log(`  - ${i}`)
} else console.log('\nNothing floating, sunk, over water or overlapping.')

// --sites <model> <turn>: where on each landform that model would stand flattest (for composing by)
if (args.includes('--sites')) {
  const id = args[args.indexOf('--sites') + 1]
  const phi = Number(args[args.indexOf('--sites') + 2] ?? 0)
  const size = worldSize(await loadModel(id, 'medium'))
  console.log(`\nflattest ground for ${id} (${(size.x * 0.72).toFixed(1)} × ${(size.z * 0.72).toFixed(1)} footprint, turned ${phi}):`)
  for (const p of placed.filter((q) => q.def.kind === 'land')) {
    const found = []
    const r = Math.hypot(p.w, p.depth) / 2
    for (let a = p.a - r; a <= p.a + r; a += 0.5)
      for (let d = p.d - r; d <= p.d + r; d += 0.5) {
        const u = under(a, d, size.x * 0.72, size.z * 0.72, phi, { on: [p.o.id] })
        if (u && u.lo > 0.6 && u.spread < 0.9) found.push({ a, d, ...u })
      }
    found.sort((x, y) => x.spread - y.spread)
    const shown = []
    for (const f of found) {
      if (shown.some((g) => Math.hypot(g.a - f.a, g.d - f.d) < 5)) continue
      shown.push(f)
      if (shown.length === 5) break
    }
    console.log(`  ${p.o.id.padEnd(16)} ${shown.map((f) => `(${f.a.toFixed(1)}, ${f.d.toFixed(1)}) ${f.lo.toFixed(1)}–${f.hi.toFixed(1)}`).join('   ') || 'none'}`)
  }
}

// --map: the land's height at every plan unit, one character each (0-9, then a = 10 … z = 35), for composing by
if (args.includes('--map')) {
  const A0 = -50
  const A1 = 54
  console.log(`\n     a: ${Array.from({ length: (A1 - A0) / 10 + 1 }, (_, k) => String(A0 + k * 10).padEnd(10)).join('')}`)
  for (let d = -48; d <= 42; d++) {
    let line = ''
    for (let a = A0; a <= A1; a++) {
      const g = ground(a, d)
      line += !g || g.y < 0.05 ? '·' : g.slope > 28 ? '^' : Math.min(35, Math.round(g.y)).toString(36)
    }
    console.log(`d ${String(d).padStart(4)} ${line}`)
  }
}

if (PREVIEW) {
  await drawPreview({
    file: PREVIEW,
    land,
    plan,
    items: placed
      .filter((p) => !isGroundKind(p.def.kind) || p.def.kind === 'path')
      .map((p) => ({ kind: p.def.kind, a: p.a, d: p.d, y: p.y, w: p.w, h: p.h, color: p.color })),
    labels: placed.filter((p) => p.def.kind === 'land').map((p) => ({ a: p.a, d: p.d, h: p.h, text: p.o.name }))
  })
  console.log(`\npreview: ${PREVIEW}`)
}

if (!DRY) {
  const scene = {
    version: 1,
    reference: '',
    camera: CAMERA,
    generated: { by: 'scripts/environment/harbor/generate.mjs', seed: SEED },
    objects
  }
  const text = `${JSON.stringify(scene, null, 2)}\n`
  // The harbor's baseline (what the editor's "Revert" goes back to) and a scene of its own to open beside the
  // working one (?scene=harbor-generated). The working scene is the editor's: it's only replaced when asked.
  const harbor = join(ROOT, 'assets/environment/harbor')
  const scenes = join(ROOT, 'assets/environment/scenes')
  mkdirSync(scenes, { recursive: true })
  writeFileSync(join(harbor, 'harbor-scene.baseline.json'), text)
  writeFileSync(join(scenes, 'harbor-generated.json'), text)
  console.log('\nwrote assets/environment/harbor/harbor-scene.baseline.json and assets/environment/scenes/harbor-generated.json')
  if (args.includes('--replace-working')) {
    const working = join(harbor, 'harbor-scene.json')
    if (existsSync(working)) {
      mkdirSync(join(harbor, 'archive'), { recursive: true })
      const kept = join(harbor, 'archive', `harbor-scene.${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
      copyFileSync(working, kept)
      console.log(`kept the working scene as ${kept.slice(ROOT.length + 1)}`)
    }
    writeFileSync(working, text)
    console.log('replaced assets/environment/harbor/harbor-scene.json')
  } else console.log('the working scene (harbor-scene.json) is left as it is: --replace-working replaces it, or "Revert" in the editor')
}
