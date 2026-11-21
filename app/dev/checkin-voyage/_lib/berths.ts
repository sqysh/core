import { BoatDims } from './boatDims'
import { pierDistance } from './coast'
import { Berth, FWD, harborShore, Path, smoothPath } from './harbor'
import { groundAt, overlaps, plateSize, Rect, SCREEN, toScreen, UI_ZONES, viewCamera } from './view'

// Where each arriving boat moors and how it gets there.
//
// Berths: candidates cover all the open water in the shot. Each new boat takes the candidate that keeps it farthest
// (on screen) from every boat already in, among those that clear every hull by its real dimensions, keep the approach
// astern of it open, and leave its nameplate clear of the other plates and the overlay cards. So the fleet spreads
// over the whole harbor from the first check-in, and the order is deterministic (a reload replays it exactly).
//
// Routes: a grid search over the water from the nearest off-screen entry gate, around land, the pier and every
// moored hull, then smoothed, ending with a straight run up into the berth head to wind.

const cam = viewCamera()

export type Occupant = { x: number; z: number; boat: BoatDims; plate: Rect }

const along = (x: number, z: number, b: { x: number; z: number }) => (x - b.x) * FWD.x + (z - b.z) * FWD.z
const across = (x: number, z: number, b: { x: number; z: number }) => -(x - b.x) * FWD.z + (z - b.z) * FWD.x

/** Distance from a point to a moored hull (a capsule along the wind) */
function hullDistance(x: number, z: number, o: { x: number; z: number; boat: BoatDims }) {
  const d = o.boat
  const a = Math.max(-d.length / 2, Math.min(d.length / 2, along(x, z, o)))
  return Math.hypot(along(x, z, o) - a, across(x, z, o))
}

/** Clearance between two moored boats lying parallel */
function hullGap(a: { x: number; z: number; boat: BoatDims }, b: { x: number; z: number; boat: BoatDims }) {
  const da = a.boat
  const db = b.boat
  const lon = Math.max(0, Math.abs(along(a.x, a.z, b)) - (da.length + db.length) / 2)
  const lat = Math.max(0, Math.abs(across(a.x, a.z, b)) - (da.beam + db.beam) / 2)
  return Math.hypot(lon, lat)
}

const APPROACH = 3.2

/** Every candidate mooring in the shot, with its screen position */
const CANDIDATES = (() => {
  const out: { x: number; z: number; sx: number; sy: number }[] = []
  for (let x = -30; x <= 50; x += 0.9)
    for (let z = -30; z <= 46; z += 0.9) {
      if (harborShore(x, z) < 3.0 || pierDistance(x, z) < 2.4) continue
      // the approach astern must be open water too
      const ax = x - FWD.x * APPROACH
      const az = z - FWD.z * APPROACH
      if (harborShore(ax, az) < 2.2 || pierDistance(ax, az) < 1.8) continue
      const s = toScreen(cam, x, 0.3, z)
      // the usable harbor: the whole water in the shot, clear of the frame edges and with room above for the nameplate
      if (s.behind || s.x < 90 || s.x > SCREEN.w - 90 || s.y < 190 || s.y > SCREEN.h - 70) continue
      // and never under an overlay card
      if (UI_ZONES.some((u) => overlaps({ x0: s.x - 60, x1: s.x + 60, y0: s.y - 30, y1: s.y + 30 }, u))) continue
      out.push({ x, z, sx: s.x, sy: s.y })
    }
  return out
})()

/** Where a boat's nameplate sits on the reference screen if it moors at (x, z) */
export function plateRect(x: number, z: number, boat: BoatDims, label: string): Rect {
  const top = toScreen(cam, x, boat.top + 0.12, z)
  const { w, h } = plateSize(label)
  return { x0: top.x - w / 2, x1: top.x + w / 2, y0: top.y - 14 - h, y1: top.y - 14 }
}

/** The first boat in takes the middle of the harbor; everyone after spreads out from there */
const HERO = { x: SCREEN.w * 0.62, y: SCREEN.h * 0.72 }

export function chooseBerth(occupied: Occupant[], boat: BoatDims, label: string): (Berth & { plate: Rect }) | null {
  let best: { c: (typeof CANDIDATES)[number]; plate: Rect; score: number; clean: boolean } | null = null
  for (const c of CANDIDATES) {
    const me = { x: c.x, z: c.z, boat }
    let ok = true
    let nearest = Infinity
    for (const o of occupied) {
      if (hullGap(me, o) < 1.6) {
        ok = false
        break
      }
      // nobody may sit in this boat's approach lane, and it mustn't sit in theirs
      for (let k = 1; k <= 3 && ok; k++) {
        const t = (APPROACH * k) / 3
        if (hullDistance(c.x - FWD.x * t, c.z - FWD.z * t, o) < (o.boat.beam + boat.beam) / 2 + 0.5) ok = false
        if (hullDistance(o.x - FWD.x * t, o.z - FWD.z * t, me) < (o.boat.beam + boat.beam) / 2 + 0.5) ok = false
      }
      if (!ok) break
      const so = toScreen(cam, o.x, 0.3, o.z)
      nearest = Math.min(nearest, Math.hypot(c.sx - so.x, (c.sy - so.y) * 1.6))
    }
    if (!ok) continue
    const plate = plateRect(c.x, c.z, boat, label)
    const onScreen = plate.x0 > 12 && plate.x1 < SCREEN.w - 12 && plate.y0 > 12
    const clean = onScreen && !UI_ZONES.some((u) => overlaps(plate, u, 8)) && !occupied.some((o) => overlaps(plate, o.plate, 10))
    const score = occupied.length ? nearest : -Math.hypot(c.sx - HERO.x, c.sy - HERO.y)
    // a spot with a clean nameplate always beats one whose plate would have to stack
    if (!best || (clean && !best.clean) || (clean === best.clean && score > best.score)) best = { c, plate, score, clean }
  }
  return best && { x: best.c.x, z: best.c.z, plate: best.plate }
}

// ─── Routes ───────────────────────────────────────────────────────────────────

const GRID = { x0: -36, z0: -36, x1: 64, z1: 56, step: 0.5 }
const NX = Math.round((GRID.x1 - GRID.x0) / GRID.step) + 1
const NZ = Math.round((GRID.z1 - GRID.z0) / GRID.step) + 1
const cellX = (i: number) => GRID.x0 + i * GRID.step
const cellZ = (j: number) => GRID.z0 + j * GRID.step

/** Water deep and wide enough to sail, ignoring boats (computed once) */
const OPEN = (() => {
  const g = new Uint8Array(NX * NZ)
  for (let j = 0; j < NZ; j++)
    for (let i = 0; i < NX; i++) g[j * NX + i] = harborShore(cellX(i), cellZ(j)) > 1.7 && pierDistance(cellX(i), cellZ(j)) > 1.1 ? 1 : 0
  return g
})()

/** Entry gates just outside the frame (right edge, bottom edge), on open water */
export const GATES = (() => {
  const out: { x: number; z: number; name: string }[] = []
  const ndc: [number, number, string][] = [
    [1.05, -0.85, 'east-low'],
    [1.05, -0.55, 'east'],
    [1.05, -0.25, 'east-high'],
    [1.05, 0.05, 'east-far'],
    [0.75, -1.07, 'south-east'],
    [0.35, -1.07, 'south'],
    [-0.05, -1.07, 'south-west']
  ]
  for (const [nx, ny, name] of ndc) {
    const { x, z } = groundAt(cam, nx, ny)
    if (harborShore(x, z) > 3) out.push({ x, z, name })
  }
  return out
})()

const cellOf = (x: number, z: number) => [
  Math.max(0, Math.min(NX - 1, Math.round((x - GRID.x0) / GRID.step))),
  Math.max(0, Math.min(NZ - 1, Math.round((z - GRID.z0) / GRID.step)))
]

/** Grid A* from a to b over open water, keeping `margin` clear of every moored hull */
function search(a: { x: number; z: number }, b: { x: number; z: number }, boats: Occupant[], margin: number) {
  const blocked = OPEN.slice()
  for (const o of boats) {
    const r = o.boat.length / 2 + margin + 0.5
    const [ci, cj] = cellOf(o.x, o.z)
    const span = Math.ceil(r / GRID.step)
    for (let j = cj - span; j <= cj + span; j++)
      for (let i = ci - span; i <= ci + span; i++) {
        if (i < 0 || j < 0 || i >= NX || j >= NZ) continue
        if (hullDistance(cellX(i), cellZ(j), o) < o.boat.beam / 2 + margin) blocked[j * NX + i] = 0
      }
  }
  const [si, sj] = cellOf(a.x, a.z)
  const [gi, gj] = cellOf(b.x, b.z)
  const start = sj * NX + si
  const goal = gj * NX + gi
  blocked[start] = 1
  blocked[goal] = 1
  const g = new Float32Array(NX * NZ).fill(Infinity)
  const from = new Int32Array(NX * NZ).fill(-1)
  const f = new Float32Array(NX * NZ).fill(Infinity)
  g[start] = 0
  f[start] = Math.hypot(gi - si, gj - sj)
  // a binary heap of cells by f
  const heap: number[] = [start]
  const push = (n: number) => {
    heap.push(n)
    let k = heap.length - 1
    while (k > 0) {
      const p = (k - 1) >> 1
      if (f[heap[p]] <= f[heap[k]]) break
      ;[heap[p], heap[k]] = [heap[k], heap[p]]
      k = p
    }
  }
  const pop = () => {
    const top = heap[0]
    const last = heap.pop()!
    if (heap.length) {
      heap[0] = last
      let k = 0
      for (;;) {
        const l = k * 2 + 1
        const r = l + 1
        let m = k
        if (l < heap.length && f[heap[l]] < f[heap[m]]) m = l
        if (r < heap.length && f[heap[r]] < f[heap[m]]) m = r
        if (m === k) break
        ;[heap[m], heap[k]] = [heap[k], heap[m]]
        k = m
      }
    }
    return top
  }
  const closed = new Uint8Array(NX * NZ)
  const steps = [
    [1, 0, 1],
    [-1, 0, 1],
    [0, 1, 1],
    [0, -1, 1],
    [1, 1, Math.SQRT2],
    [1, -1, Math.SQRT2],
    [-1, 1, Math.SQRT2],
    [-1, -1, Math.SQRT2]
  ]
  while (heap.length) {
    const cur = pop()
    if (cur === goal) break
    if (closed[cur]) continue
    closed[cur] = 1
    const ci = cur % NX
    const cj = (cur - ci) / NX
    for (const [di, dj, cost] of steps) {
      const ni = ci + di
      const nj = cj + dj
      if (ni < 0 || nj < 0 || ni >= NX || nj >= NZ) continue
      const n = nj * NX + ni
      if (!blocked[n] || closed[n]) continue
      const ng = g[cur] + cost
      if (ng < g[n]) {
        g[n] = ng
        from[n] = cur
        f[n] = ng + Math.hypot(gi - ni, gj - nj)
        push(n)
      }
    }
  }
  if (from[goal] < 0 && goal !== start) return null
  const cells: { x: number; z: number }[] = []
  for (let c = goal; c >= 0; c = from[c]) cells.push({ x: cellX(c % NX), z: cellZ(Math.floor(c / NX)) })
  cells.reverse()
  // string-pull: keep only the turns needed to stay on open water
  const clear = (p: { x: number; z: number }, q: { x: number; z: number }) => {
    const n = Math.ceil(Math.hypot(q.x - p.x, q.z - p.z) / (GRID.step * 0.5))
    for (let k = 0; k <= n; k++) {
      const [i, j] = cellOf(p.x + ((q.x - p.x) * k) / n, p.z + ((q.z - p.z) * k) / n)
      if (!blocked[j * NX + i]) return false
    }
    return true
  }
  const out = [cells[0]]
  let anchor = 0
  for (let k = 2; k < cells.length; k++) {
    if (!clear(cells[anchor], cells[k])) {
      out.push(cells[k - 1])
      anchor = k - 1
    }
  }
  out.push(cells[cells.length - 1])
  return { points: out, cost: g[goal] * GRID.step }
}

/**
 * The route in for a boat: from whichever off-screen gate gives the shortest clear passage (avoiding the gate the
 * last boat used, so arrivals come from different directions), round everything moored, then straight up into the
 * berth along the wind.
 */
export function planRoute(berth: Berth, boat: BoatDims, others: Occupant[], lastGate: string | null): { path: Path; gate: string } {
  const approach = { x: berth.x - FWD.x * APPROACH, z: berth.z - FWD.z * APPROACH }
  const margin = boat.beam / 2 + 0.45
  let best: { points: { x: number; z: number }[]; cost: number; gate: string } | null = null
  for (const gate of GATES) {
    const r = search(gate, approach, others, margin)
    if (!r) continue
    // how far the route runs off-screen before the boat comes into view: arrivals should appear almost at once
    let offLen = 0
    for (let i = 1; i < r.points.length; i++) {
      const sc = toScreen(cam, r.points[i].x, 0.3, r.points[i].z)
      if (sc.x > 0 && sc.x < SCREEN.w && sc.y > 0 && sc.y < SCREEN.h) break
      offLen += Math.hypot(r.points[i].x - r.points[i - 1].x, r.points[i].z - r.points[i - 1].z)
    }
    const cost = r.cost + 2.5 * offLen + (gate.name === lastGate ? 4 : 0)
    if (!best || cost < best.cost) best = { points: r.points, cost, gate: gate.name }
  }
  const lead = { x: berth.x - FWD.x * (APPROACH * 0.45), z: berth.z - FWD.z * (APPROACH * 0.45) }
  const points = best ? [...best.points.slice(0, -1), approach, lead, berth] : [{ x: berth.x - FWD.x * 14, z: berth.z - FWD.z * 14 }, approach, lead, berth]
  return { path: smoothPath(dedupe(points)), gate: best?.gate ?? 'astern' }
}

function dedupe(points: { x: number; z: number }[]) {
  return points.filter((p, i) => i === 0 || Math.hypot(p.x - points[i - 1].x, p.z - points[i - 1].z) > 0.35)
}
