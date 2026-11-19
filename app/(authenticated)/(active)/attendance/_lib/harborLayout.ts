// The harbor's rules, all in the illustration's own pixels (see harborMap.ts): where the water is, how big a boat
// is at a given depth, where boats berth, how they sail in, and where their nameplates go.
import { HORIZON_Y, SCENE_H, SCENE_W, SHORE, WATER_CELL, WATER_ROWS } from './harborMap'

export interface Point {
  x: number
  y: number
}

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

// ─── Water ────────────────────────────────────────────────────────────────────

const COLS = Math.ceil(SCENE_W / WATER_CELL)
const GRID: Uint8Array[] = WATER_ROWS.map((row) => {
  const cells = new Uint8Array(COLS)
  let i = 0
  let water = false
  for (const n of row.split('.').map(Number)) {
    if (water) cells.fill(1, i, i + n)
    i += n
    water = !water
  }
  return cells
})

// The island's waterline at each x, so a boat further back than it counts as hidden behind it rather than on land
const SHORE_PTS = SHORE.split(' ').map((p) => p.split(',').map(Number) as [number, number])
const ISLAND_X0 = SHORE_PTS[0][0]
const ISLAND_X1 = SHORE_PTS[SHORE_PTS.length - 1][0]

export function islandWaterline(x: number) {
  if (x < ISLAND_X0 || x > ISLAND_X1) return null
  const i = Math.min(SHORE_PTS.length - 1, Math.round((x - ISLAND_X0) / 8))
  return SHORE_PTS[i][1]
}

/** Open water. Off the left, right and bottom edges is open sea too. */
export function isWater(x: number, y: number) {
  if (y < HORIZON_Y + 2) return false
  if (x < 0 || x >= SCENE_W || y >= SCENE_H) return true
  const row = GRID[Math.min(GRID.length - 1, Math.floor((y - HORIZON_Y) / WATER_CELL))]
  return row[Math.floor(x / WATER_CELL)] === 1
}

/** Somewhere a boat can be: open water, or water hidden behind the island */
function isSailable(x: number, y: number) {
  if (isWater(x, y)) return true
  const shore = islandWaterline(x)
  return shore !== null && y >= HORIZON_Y + 2 && y < shore - 6
}

// ─── Scale ────────────────────────────────────────────────────────────────────

/** Hull length of an average boat whose waterline sits at y. Things shrink linearly toward the horizon. */
export function lengthAt(y: number) {
  return 1.1 * Math.max(0, y - HORIZON_Y)
}

// ─── Berths ───────────────────────────────────────────────────────────────────

export interface Berth extends Point {
  /** Average hull length here */
  L: number
}

const FIRST_ROW = 968
const LAST_ROW = 1215

/**
 * Every spot a boat could moor. Rows are spaced by depth so there's a clear lane in front of each one to sail along,
 * and each spot needs its whole hull on open water with room either side for a bigger-than-average boat.
 */
export const BERTHS: Berth[] = (() => {
  const out: Berth[] = []
  let row = 0
  for (let y = FIRST_ROW; y <= LAST_ROW; y += 0.36 * lengthAt(y), row++) {
    const L = lengthAt(y)
    const spacing = 1.5 * L
    for (let x = 0.9 * L + (row % 2 ? spacing / 2 : 0); x < SCENE_W - 0.9 * L; x += spacing) {
      let clear = true
      for (let t = -0.65; t <= 0.65 && clear; t += 0.1) {
        const px = x + t * L
        clear = isWater(px, y + 4) && isWater(px, y - 3) && isWater(px, y - 0.12 * L)
      }
      if (clear) out.push({ x: Math.round(x), y: Math.round(y), L })
    }
  }
  return out
})()

/** How much each depth is wanted. Mid-to-near water shows boats at a size you can read; the far rows near the horizon
 * are tiny, so they only fill once the closer water is busy. */
const PREFERENCE: [number, number][] = [
  [960, 0.18],
  [1000, 0.35],
  [1040, 0.75],
  [1090, 1],
  [1170, 1],
  [1220, 0.8]
]
function depthPreference(y: number) {
  if (y <= PREFERENCE[0][0]) return PREFERENCE[0][1]
  for (let i = 1; i < PREFERENCE.length; i++) {
    const [y1, w1] = PREFERENCE[i]
    const [y0, w0] = PREFERENCE[i - 1]
    if (y <= y1) return w0 + ((w1 - w0) * (y - y0)) / (y1 - y0)
  }
  return PREFERENCE[PREFERENCE.length - 1][1]
}

function separation(a: Berth, b: Berth) {
  const L = (a.L + b.L) / 2
  return Math.hypot((a.x - b.x) / L, (a.y - b.y) / (0.36 * L))
}

/**
 * The next berth: as far from every boat already moored as it can be, weighted toward the middle distance. Pure
 * and deterministic, so the same arrivals in the same order always land in the same places, even after a reload.
 */
export function chooseBerth(taken: { berth: Berth; rect: Rect }[], shape: (b: Berth) => Rect): Berth | null {
  // Never hide much of a boat behind another (or be hidden); only relax that once the harbor is genuinely full
  for (const allowed of [0.25, 0.45, 0.7, 1.01]) {
    let best: Berth | null = null
    let bestScore = -1
    for (const b of BERTHS) {
      if (taken.some((t) => t.berth.x === b.x && t.berth.y === b.y)) continue
      const r = shape(b)
      if (taken.some((t) => coverage(r, t.rect) > allowed)) continue
      const nearest = taken.length
        ? Math.min(...taken.map((t) => separation(b, t.berth)))
        : 4 - Math.abs(b.x / SCENE_W - 0.5)
      if (taken.length && nearest < 0.9) continue
      const score = nearest * depthPreference(b.y)
      if (score > bestScore) {
        bestScore = score
        best = b
      }
    }
    if (best) return best
  }
  return null
}

/** How much of the smaller of two boats the other one covers, 0 to 1 */
function coverage(a: Rect, b: Rect) {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)
  if (w <= 0 || h <= 0) return 0
  return (w * h) / Math.min(a.w * a.h, b.w * b.h)
}

// ─── Voyages ──────────────────────────────────────────────────────────────────

export interface Voyage {
  /** Sampled path from off screen to the berth, roughly every 10 units */
  points: Point[]
  /** 1 when travelling (and facing) right */
  facing: 1 | -1
  duration: number
}

function quad(a: Point, c: Point, b: Point, t: number): Point {
  const u = 1 - t
  return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y }
}

function sample(segments: ((t: number) => Point)[]) {
  const pts: Point[] = []
  for (const seg of segments) {
    const a = seg(0)
    const b = seg(1)
    const n = Math.max(2, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 10))
    for (let i = pts.length ? 1 : 0; i <= n; i++) pts.push(seg(i / n))
  }
  return pts
}

function pathLength(pts: Point[]) {
  let d = 0
  for (let i = 1; i < pts.length; i++) d += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y)
  return d
}

/**
 * Sails in from beyond the nearest side of the picture along the lane just in front of the berth's row, then turns up
 * into the berth. Moored boats sit on the rows, so the lane passes in front of or behind them, never through them.
 * Falls back to the far side (round the back of the island) if the near lane isn't open water.
 */
export function planVoyage(berth: Berth, L: number): Voyage {
  const laneY = berth.y + 0.18 * berth.L
  const sides: (1 | -1)[] = berth.x < SCENE_W / 2 ? [1, -1] : [-1, 1]

  for (const dir of sides) {
    const start = { x: dir === 1 ? -0.9 * L : SCENE_W + 0.9 * L, y: laneY + 0.05 * berth.L }
    const turn = { x: berth.x - dir * 1.2 * L, y: laneY }
    const ctrl = { x: berth.x - dir * 0.2 * L, y: laneY }
    const points = sample([
      (t) => ({ x: start.x + (turn.x - start.x) * t, y: start.y + (turn.y - start.y) * t }),
      (t) => quad(turn, ctrl, berth, t)
    ])
    if (points.every((p) => isSailable(p.x, p.y))) {
      const len = pathLength(points)
      const speed = 150 + 1.1 * berth.L
      return { points, facing: dir, duration: Math.min(14, Math.max(6, len / speed)) }
    }
  }

  // Straight up from below the picture
  const start = { x: berth.x, y: SCENE_H + 0.6 * L }
  const points = sample([(t) => ({ x: berth.x, y: start.y + (berth.y - start.y) * t })])
  return { points, facing: berth.x < SCENE_W / 2 ? 1 : -1, duration: 7 }
}

/** Distance along the voyage at time fraction t: cruising, then easing off into the berth with no jolt between */
export function voyageProgress(t: number) {
  const a = 0.4
  const b = 0.18
  if (t <= 1 - a) return ((1 - b) * t) / (1 - a)
  const u = (t - (1 - a)) / a
  return 1 - b + b * (1 - Math.pow(1 - u, 3))
}

export function pointAt(points: Point[], fraction: number): Point {
  const total = pathLength(points)
  let target = fraction * total
  for (let i = 1; i < points.length; i++) {
    const d = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y)
    if (target <= d) {
      const k = d ? target / d : 0
      return {
        x: points[i - 1].x + (points[i].x - points[i - 1].x) * k,
        y: points[i - 1].y + (points[i].y - points[i - 1].y) * k
      }
    }
    target -= d
  }
  return points[points.length - 1]
}

// ─── Nameplates ───────────────────────────────────────────────────────────────

/** A plate's height at full size; plates for distant boats shrink with them, down to a size still readable on a TV */
export const PLATE_H = 56
const PLATE_GAP = 10

export function plateScale(L: number) {
  return Math.round(Math.min(1, Math.max(0.68, L / 200)) * 100) / 100
}

/** Plates never cover the lighthouse */
const LIGHTHOUSE: Rect = { x: 1120, y: 40, w: 250, h: 730 }

function overlaps(a: Rect, b: Rect, pad = 0) {
  return a.x < b.x + b.w + pad && b.x < a.x + a.w + pad && a.y < b.y + b.h + pad && b.y < a.y + a.h + pad
}

function crosses([a, b]: [Point, Point], [c, d]: [Point, Point]) {
  const side = (p: Point, q: Point, r: Point) => Math.sign((q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x))
  return side(a, b, c) !== side(a, b, d) && side(c, d, a) !== side(c, d, b)
}

/** Full-size width of a plate: avatar, padding and the name */
export function plateWidth(label: string) {
  return Math.round(PLATE_H + 26 + label.length * 17.5)
}

/** The rope from a plate's bottom edge to the top of its boat */
export function ropeOf(plate: Rect, top: Point): [Point, Point] {
  return [{ x: plate.x + plate.w / 2, y: plate.y + plate.h }, top]
}

/**
 * Where a boat's nameplate goes: straight above it if that's free, otherwise the nearest free spot to one side or
 * higher up, avoiding ropes that would cross another plate's rope. Placed one at a time in arrival order against the
 * plates already placed, so existing plates never move.
 */
export function placePlate(
  top: Point,
  w: number,
  h: number,
  placed: { plate: Rect; top: Point }[],
  boats: Rect[]
): Rect {
  const gap = PLATE_GAP * (h / PLATE_H)
  const ropes = placed.map((p) => ropeOf(p.plate, p.top))
  let best: Rect | null = null
  let bestCost = Infinity
  for (let level = 0; level < 10; level++) {
    for (const shift of [0, -0.5, 0.5, -1, 1, -1.5, 1.5]) {
      const r = {
        x: Math.round(top.x - w / 2 + shift * (w + gap)),
        y: Math.round(top.y - 18 - h - level * (h + gap)),
        w,
        h
      }
      if (r.x < 8 || r.x + r.w > SCENE_W - 8 || r.y < 20) continue
      if (placed.some((p) => overlaps(r, p.plate, gap / 2))) continue
      const rope = ropeOf(r, top)
      const cost =
        level * 70 +
        Math.abs(shift) * 60 +
        ropes.filter((o) => crosses(rope, o)).length * 260 +
        placed.filter((p) =>
          crosses(ropeOf(p.plate, p.top), [
            { x: r.x, y: r.y + r.h / 2 },
            { x: r.x + r.w, y: r.y + r.h / 2 }
          ])
        ).length *
          260 +
        (overlaps(r, LIGHTHOUSE) ? 3000 : 0) +
        boats.filter((b) => overlaps(r, b)).length * 140
      if (cost < bestCost) {
        bestCost = cost
        best = r
      }
    }
  }
  return best ?? { x: Math.round(top.x - w / 2), y: Math.round(top.y - 18 - h), w, h }
}
