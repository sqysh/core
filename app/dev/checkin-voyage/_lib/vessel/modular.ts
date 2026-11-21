import { partsOf, StageId, stageOf, STAGES, VesselConfig, ZoneId, ZoneRoom } from '@/lib/vessel/catalog'
import { effectsOf, HULL_LENGTH } from '@/lib/vessel/items'
import { HullSpec, hullStations } from '../hullLines'
import { Vec3, VESSEL_CLASS_SPECS, VesselClassSpec } from './classes'

// The modular boat, laid out from its fitted parts as plain numbers: the hull's lines (lofted fresh for its length,
// beam, depth and bow, so a longer boat is genuinely longer, not scaled), where its console, seats, canopy, upper deck,
// mast and engines stand, the spot every fitting sits on, the deck zones accessories are packed into (with as many rows
// as the vessel level has room for), and the class spec the harbor sails it by (size,
// buoyancy, ride and handling all follow from what it's built with). The 3D model (boats/Modular.tsx) and the harbor's
// physics both read from this, so they always agree. Bow along +x, waterline near y = 0, starboard toward -z.

type Box = { x: number; z: number; len: number; w: number; y: number; h: number }

/** A deck zone laid out: where each row and lane of it is (row 0 is its aft end), and how big a row is */
export type Zone = {
  rows: number
  lanes: number
  rowLen: number
  /** The middle of a spot (lane 0 to port), or of a run of full rows */
  cell: (row: number, lane: number) => Vec3
  span: (row: number, rows: number) => Vec3
  /** The width there is across the zone */
  width: number
}

export type ModularLayout = {
  parts: Set<string>
  has: (id: string) => boolean
  length: number
  beam: number
  hull: HullSpec
  spec: VesselClassSpec
  /** Sheer height and half-beam at a point along the hull, and the deck's height there */
  at: (x: number) => { y: number; hb: number; deck: number }
  stern: number
  bow: number
  console: (Box & { kind: 'center' | 'side' | 'nav' }) | null
  /** A roof over the helm: canvas, a hard top on its poles, or a wheelhouse (y is the roof's underside) */
  canopy: (Box & { kind: 'bimini' | 'hardtop' | 'wheelhouse' }) | null
  /** The frame the hard top stands on (it can be fitted before the roof) */
  poles: Box | null
  flybridge: Box | null
  /** The flybridge's own helm and seat (forward on it, leaving its aft deck free) */
  flyHelm: { console: number; seat: number } | null
  /** The roof over the flybridge, the third level */
  skyRoof: Box | null
  /** The swim platform off the transom, at the waterline */
  platform: { x: number; y: number; len: number; w: number } | null
  /** The deck zones accessories are packed into */
  zones: Partial<Record<ZoneId, Zone>>
  mast: { x: number; foot: number; h: number; boomY: number; boomLen: number } | null
  seats: { fwd: number; cooler: number; center: number; stern: number; helm: Vec3; passenger: Vec3 }
  /** Outboards on the transom: each one's z */
  outboards: number[]
  /** Where the helmsman stands, and how */
  crew: { at: Vec3; turn: number; pose: 'stand' | 'helm' | 'wave' }
  spots: {
    ensign: Vec3
    lantern: Vec3
    quarters: [Vec3, Vec3]
    fuel: Vec3
    crate: Vec3
    tackle: Vec3
    traps: Vec3
    lifering: { at: Vec3; turn: number }
    /** Two spots on the roof, aft (radar) and forward (lights), when there's a roof */
    roof: [Vec3, Vec3] | null
    antenna: Vec3
    masthead: Vec3 | null
    /** Lines dressed with pennants or lights: the rig's stays, or the canopy's edge */
    lines: [Vec3, Vec3][] | null
    chest: Vec3
    bow: Vec3
    nameplate: { x: number; y: number; hb: number }
  }
  /** Highest point above the waterline (for the nameplate on the TV and the Garage's framing) */
  top: number
}

const cache = new Map<string, ModularLayout>()

/** The layout of a set of parts on a vessel level (cached: a handful of builds are ever on screen) */
export function layoutOf(parts: Iterable<string>, stage: StageId = 'skiff'): ModularLayout {
  const list = [...new Set(parts)].sort()
  const key = `${stage}:${list.join('|')}`
  const hit = cache.get(key)
  if (hit) return hit
  const made = makeLayout(new Set(list), STAGES[stage].room)
  cache.set(key, made)
  return made
}

/** Any boat's spec: a heritage class's own, or the one a modular boat's parts give it */
export function specOf(c: VesselConfig): VesselClassSpec {
  return c.vesselClass === 'modular' ? layoutOf(partsOf(c), stageOf(c)).spec : VESSEL_CLASS_SPECS[c.vesselClass]
}

function makeLayout(parts: Set<string>, room: Partial<Record<ZoneId, ZoneRoom>>): ModularLayout {
  const has = (id: string) => parts.has(id)
  const L = HULL_LENGTH[[...parts].find((p) => p in HULL_LENGTH) ?? 'hull:skiff']
  const wide = has('hull:wide')
  const deep = has('hull:deep')
  const beam = (0.36 + 0.19 * L) * (wide ? 1.16 : 1)
  const hull: HullSpec = {
    length: L,
    beam,
    depth: (0.15 + 0.1 * L) * (deep ? 1.18 : 1),
    sheer: 0.08 + 0.035 * L + (deep ? 0.035 : 0),
    sheerRise: (0.06 + 0.045 * L) * (has('hull:raised-bow') ? 1.75 : 1),
    transom: 0.84,
    rake: has('hull:raised-bow') ? 0.16 : 0.12,
    fullness: 0.46,
    waterline: -(0.03 + 0.01 * L)
  }
  const st = hullStations(hull)
  const at = (x: number) => {
    const s = Math.min(1, Math.max(0, x / L + 0.5))
    const y = st.sheer(s)
    return { y, hb: st.halfBeam(s), deck: y - 0.03 }
  }
  const stern = -L / 2
  const bow = L / 2

  // ── helm ──
  let console: ModularLayout['console'] = null
  if (has('helm:center')) {
    const x = 0.02 * L
    console = { kind: 'center', x, z: 0, len: 0.2, w: Math.min(0.34, beam * 0.45), y: at(x).deck, h: 0.26 }
  }
  if (has('helm:nav')) {
    const x = 0.03 * L
    console = { kind: 'nav', x, z: 0, len: 0.26, w: Math.min(0.42, beam * 0.5), y: at(x).deck, h: 0.32 }
  }
  if (has('helm:side')) {
    const x = 0.06 * L
    const w = 0.22
    console = { kind: 'side', x, z: -(at(x).hb - w / 2 - 0.05), len: 0.16, w, y: at(x).deck, h: 0.24 }
  }

  // ── canopy and the levels above ──
  let poles: Box | null = null
  let canopy: ModularLayout['canopy'] = null
  if (console && (has('top:poles') || has('top:hardtop'))) {
    const x = console.x - 0.1
    poles = { x, z: 0, len: 0.5, w: Math.min(beam * 0.86, 0.7), y: at(x).deck + 0.64, h: 0.03 }
  }
  if (has('top:hardtop') && poles) canopy = { kind: 'hardtop', ...poles, h: 0.04 }
  if (has('top:bimini')) {
    // over the helm, or over the cockpit aft on a tiller boat
    const x = console ? console.x - 0.08 : -0.18 * L
    canopy = { kind: 'bimini', x, z: 0, len: 0.55, w: Math.min(beam * 0.9, 0.72), y: at(x).deck + 0.6, h: 0.08 }
  }
  if (has('top:wheelhouse')) {
    const len = 0.28 * L
    const x = 0.06 * L
    const h = 0.42 + 0.04 * L
    canopy = { kind: 'wheelhouse', x, z: 0, len, w: beam * 0.72, y: at(x).deck + h, h: 0.05 }
  }
  const flybridge: Box | null =
    has('top:flybridge') && canopy && canopy.kind !== 'bimini'
      ? { x: canopy.x - 0.03, z: 0, len: canopy.len + 0.12, w: canopy.w + 0.04, y: canopy.y + canopy.h, h: 0.2 }
      : null
  const flyHelm = flybridge
    ? { console: flybridge.x + flybridge.len / 2 - 0.12, seat: flybridge.x + flybridge.len / 2 - 0.3 }
    : null
  const skyRoof: Box | null =
    has('top:sky-roof') && flybridge
      ? { x: flybridge.x + 0.04, z: 0, len: flybridge.len * 0.82, w: flybridge.w, y: flybridge.y + 0.58, h: 0.04 }
      : null
  const platform = has('hull:swim-platform')
    ? { x: stern - 0.13, y: 0.03, len: 0.24, w: Math.min(beam * 0.82, at(stern).hb * 2) }
    : null

  // ── mast and boom ──
  let mast: ModularLayout['mast'] = null
  if (has('top:mast')) {
    const fore = console ? console.x + console.len / 2 : 0.05 * L
    const x = Math.max(0.12 * L, fore + 0.1)
    const boomY = console ? Math.max(0.48, console.h + 0.22) : 0.48
    mast = { x, foot: at(x).deck, h: 1.05 * L + 0.2, boomY, boomLen: Math.min(x - stern - 0.2, 0.5 * L) }
  }

  // ── seats ──
  const helmBack = console ? console.x - console.len / 2 - 0.17 : stern + 0.4
  const helmZ = console?.kind === 'side' ? console.z : 0
  const seats: ModularLayout['seats'] = {
    fwd: 0.27 * L,
    cooler: console ? console.x + console.len / 2 + 0.11 : 0.2 * L,
    center: -0.04 * L,
    stern: stern + 0.2,
    helm: [helmBack, at(helmBack).deck, helmZ],
    passenger: [helmBack, at(helmBack).deck, helmZ + (console?.kind === 'side' ? 0.3 : 0.24)]
  }

  // ── engines ──
  const outboards = has('engine:inboard') ? [] : has('engine:twin') ? [beam * 0.2, -beam * 0.2] : [0]

  // ── the helmsman ──
  const crew: ModularLayout['crew'] = flybridge
    ? { at: [flyHelm!.console - 0.12, flybridge.y, 0.1], turn: 0, pose: 'helm' }
    : canopy?.kind === 'wheelhouse'
      ? {
          at: [canopy.x - canopy.len / 2 - 0.22, at(canopy.x - canopy.len / 2 - 0.22).deck, 0.14],
          turn: 0.4,
          pose: 'wave'
        }
      : console
        ? { at: [console.x - console.len / 2 - 0.12, at(console.x).deck, helmZ], turn: 0, pose: 'helm' }
        : { at: [stern + 0.32, at(stern + 0.32).deck, -0.08], turn: 0, pose: 'helm' }

  // ── where the gear goes ──
  const sternY = at(stern + 0.05).y
  const hbAft = at(stern + 0.4).hb
  const quarter = (side: 1 | -1): Vec3 => [stern + 0.16, at(stern + 0.16).y, side * (at(stern + 0.16).hb - 0.05)]
  let roof: [Vec3, Vec3] | null = null
  if (skyRoof) {
    const ry = skyRoof.y + skyRoof.h
    roof = [
      [skyRoof.x - skyRoof.len * 0.3, ry, 0],
      [skyRoof.x + skyRoof.len / 2, skyRoof.y, 0]
    ]
  } else if (flybridge) {
    const archY = flybridge.y + 0.46
    roof = [
      [flybridge.x - flybridge.len / 2 + 0.08, archY, 0],
      [flybridge.x - flybridge.len / 2 + 0.08, archY, flybridge.w * 0.3]
    ]
  } else if (canopy && canopy.kind !== 'bimini') {
    const ry = canopy.y + canopy.h
    roof = [
      [canopy.x - canopy.len * 0.18, ry, 0],
      [canopy.x + canopy.len * 0.36, ry, 0]
    ]
  } else if (poles) {
    roof = [
      [poles.x - poles.len * 0.18, poles.y + poles.h, 0],
      [poles.x + poles.len / 2, poles.y, 0]
    ]
  }
  const masthead: Vec3 | null = mast ? [mast.x, mast.foot + mast.h, 0] : null
  const stemHead: Vec3 = [bow - 0.06, at(bow - 0.06).y + 0.04, 0]
  const roofEdge = (c: Box): [Vec3, Vec3][] => {
    const y = c.y + c.h * 0.5
    const a: Vec3 = [c.x + c.len / 2, y, c.w / 2]
    const b: Vec3 = [c.x + c.len / 2, y, -c.w / 2]
    const d: Vec3 = [c.x - c.len / 2, y, -c.w / 2]
    const e: Vec3 = [c.x - c.len / 2, y, c.w / 2]
    return [
      [a, b],
      [b, d],
      [d, e],
      [e, a]
    ]
  }
  const lines: [Vec3, Vec3][] | null =
    has('top:rigging') && masthead
      ? [
          [stemHead, masthead],
          [masthead, [stern + 0.04, sternY + 0.05, 0]]
        ]
      : canopy
        ? roofEdge(canopy)
        : null
  const lifering: ModularLayout['spots']['lifering'] =
    canopy?.kind === 'wheelhouse'
      ? { at: [canopy.x - canopy.len / 2 - 0.012, at(canopy.x).deck + 0.3, canopy.w * 0.22], turn: -Math.PI / 2 }
      : console
        ? { at: [console.x - console.len / 2 - 0.012, console.y + console.h * 0.55, console.z], turn: -Math.PI / 2 }
        : { at: [stern + 0.03, sternY - 0.02, hbAft * 0.55], turn: Math.PI / 2 }
  const antennaBase: Vec3 = roof
    ? [roof[0][0] - 0.05, roof[0][1], -(canopy?.w ?? poles?.w ?? 0.4) * 0.4]
    : console
      ? [console.x - console.len / 2 + 0.03, console.y + console.h, console.z - console.w / 2 + 0.03]
      : [stern + 0.1, sternY, -hbAft + 0.08]
  const chestX = Math.min(0.3 * L, bow - 0.35)

  // ── deck zones: the room each part of the deck has for accessories, split into the level's rows ──
  const zone = (
    rows: number,
    lanes: number,
    from: number,
    to: number,
    y: (x: number) => number,
    halfWidth: number,
    z = 0
  ): Zone => {
    const len = Math.max(to - from, 0.12)
    const rowLen = len / rows
    const lane = (l: number) => (lanes === 2 ? (l === 0 ? 1 : -1) * Math.min(halfWidth * 0.5, 0.26) : 0) + z
    const x = (r: number) => from + (r + 0.5) * rowLen
    return {
      rows,
      lanes,
      rowLen,
      width: halfWidth * 2,
      cell: (r, l) => [x(r), y(x(r)), lane(l)],
      span: (r, n) => {
        const cx = from + (r + n / 2) * rowLen
        return [cx, y(cx), z]
      }
    }
  }
  const zones: Partial<Record<ZoneId, Zone>> = {}
  const deckY = (x: number) => at(x).deck
  // aft deck: from the stern (clear of the stern bench) to the helm, its seats, or the wheelhouse
  const aftFrom = stern + (has('seat:stern') ? 0.34 : 0.28)
  const aftTo =
    canopy?.kind === 'wheelhouse'
      ? canopy.x - canopy.len / 2 - 0.08
      : console
        ? has('seat:post') || has('seat:captain')
          ? seats.helm[0] - 0.1
          : console.x - console.len / 2 - 0.1
        : seats.fwd - 0.1
  if (room.aft)
    zones.aft = zone(room.aft.rows, room.aft.lanes, aftFrom, aftTo, deckY, at((aftFrom + aftTo) / 2).hb - 0.06)
  // foredeck: from whatever stands furthest forward to just short of the bow
  const fore = Math.max(
    has('seat:bench') ? seats.fwd + 0.07 : -Infinity,
    has('seat:cooler') ? seats.cooler + 0.08 : -Infinity,
    console ? console.x + console.len / 2 + 0.05 : -Infinity,
    canopy?.kind === 'wheelhouse' ? canopy.x + canopy.len / 2 + 0.06 : -Infinity,
    mast ? mast.x + 0.06 : -Infinity,
    -0.1 * L
  )
  const bowTo = bow - 0.3
  if (room.bow) zones.bow = zone(room.bow.rows, room.bow.lanes, fore, bowTo, deckY, at((fore + bowTo) / 2).hb - 0.07)
  // roof: the sky roof, the arch over the flybridge, or the hard top / wheelhouse roof
  if (room.roof) {
    if (skyRoof) {
      const y = skyRoof.y + skyRoof.h
      zones.roof = zone(
        room.roof.rows,
        room.roof.lanes,
        skyRoof.x - skyRoof.len / 2 + 0.06,
        skyRoof.x + skyRoof.len / 2 - 0.06,
        () => y,
        skyRoof.w / 2 - 0.05
      )
    } else if (flybridge && roof) {
      const ax = roof[0][0]
      zones.roof = zone(
        room.roof.rows,
        room.roof.lanes,
        ax - 0.06,
        ax + 0.06,
        () => roof![0][1] + 0.01,
        flybridge.w / 2 - 0.08
      )
    } else if (canopy && canopy.kind !== 'bimini') {
      const y = canopy.y + canopy.h
      zones.roof = zone(
        room.roof.rows,
        room.roof.lanes,
        canopy.x - canopy.len / 2 + 0.06,
        canopy.x + canopy.len / 2 - 0.06,
        () => y,
        canopy.w / 2 - 0.05
      )
    }
  }
  // flybridge deck: aft of its helm seat
  if (room.upper && flybridge && flyHelm) {
    const y = flybridge.y
    zones.upper = zone(
      room.upper.rows,
      room.upper.lanes,
      flybridge.x - flybridge.len / 2 + 0.06,
      flyHelm.seat - 0.1,
      () => y,
      flybridge.w / 2 - 0.06
    )
  }
  // stern: the swim platform (row 0) when there is one, and the transom
  if (room.stern) {
    const off = Math.min(beam * 0.27, 0.3)
    const transomX = stern + 0.08
    const rows = room.stern.rows
    const rowAt = (r: number) =>
      platform && rows > 1 && r === 0
        ? { x: platform.x, y: platform.y + 0.02 }
        : { x: transomX, y: at(transomX).y - 0.02 }
    zones.stern = {
      rows,
      lanes: room.stern.lanes,
      rowLen: platform ? platform.len : 0.16,
      width: off * 2,
      cell: (r, l) => {
        const p = rowAt(r)
        return [p.x, p.y, room.stern!.lanes === 2 ? (l === 0 ? off : -off) : 0]
      },
      span: (r) => {
        const p = rowAt(r)
        return [p.x, p.y, 0]
      }
    }
  }

  // ── how high it stands ──
  const top = Math.max(
    crew.at[1] + 0.38,
    console ? console.y + console.h + 0.18 : 0,
    canopy ? canopy.y + canopy.h : 0,
    poles ? poles.y + poles.h : 0,
    flybridge ? flybridge.y + 0.5 : 0,
    skyRoof ? skyRoof.y + skyRoof.h + 0.3 : 0,
    masthead ? masthead[1] : 0,
    has('deck:antenna') ? antennaBase[1] + 0.5 : 0
  )

  // ── the class spec: buoyancy, ride and handling follow from size and what drives it ──
  // Bigger hulls run faster and ride steadier but gather way, turn and stop more slowly and draw more water; a keel
  // steadies her and takes her further, at the cost of draft. Functional equipment (items.ts, `effect`) adjusts the
  // result, and the harbor's controller reads every one of these numbers.
  const sqrtL = Math.sqrt(L)
  const heavy = (has('top:wheelhouse') ? 0.88 : 1) * (flybridge ? 0.92 : 1) * (deep ? 0.94 : 1)
  const engine = has('engine:twin') ? 4.1 : has('engine:inboard') ? 3.5 : has('engine:large') ? 3.4 : 2.5
  const fx = effectsOf(parts)
  const cruise = (engine + (has('top:sails') ? 0.25 : 0)) * (0.86 + 0.09 * L) * fx.cruise
  const accel =
    ((has('engine:twin') ? 2.0 : has('engine:large') ? 1.6 : has('engine:inboard') ? 1.25 : 1.1) / Math.sqrt(L / 1.9)) *
    fx.accel
  // a fin keel reaches well below the hull; otherwise she draws her hull and the leg of her outboard
  const draft = hull.depth - (0.065 + 0.01 * L) + (mast ? 0.55 * (L / 2.25) + 0.12 : has('hull:keel') ? 0.2 : 0.14)
  const spec: VesselClassSpec = {
    hull,
    dims: { length: L, beam, top },
    lift: 0.065 + 0.01 * L + (deep ? 0.012 : 0),
    bottom: '#8e3b2e',
    handling: {
      cruise,
      reverse: 0.35,
      accel,
      brake: 1.3 / Math.sqrt(L / 1.9),
      turn: (1.15 / sqrtL) * (wide ? 0.92 : 1) * (has('hull:keel') ? 0.95 : 1) * fx.turn,
      lean: 0.5 - 0.06 * L,
      heel: 0.2 - 0.03 * L,
      planing: has('engine:large') || has('engine:twin') ? 0.06 : 0.025,
      steerage: Math.max(0.12, fx.steerage)
    },
    ride: {
      heave: (7.0 / sqrtL) * heavy,
      pitch: (6.0 / sqrtL) * heavy,
      roll: (5.2 / sqrtL) * heavy * (wide ? 0.85 : 1) * (has('hull:keel') ? 0.92 : 1) * (mast ? 0.85 : 1) * fx.roll,
      damping: Math.max(0.5, fx.damping)
    },
    anchor: 0.09 + 0.02 * L,
    draft,
    range: (14 + 12 * L) * (has('hull:keel') ? 1.1 : 1) * fx.range,
    mounts: {
      roller: [bow - 0.08, at(bow - 0.08).y + 0.015, 0],
      ensign: { at: [stern + 0.05, sternY + 0.27, -beam * 0.3], size: 0.11 + 0.01 * L },
      masthead: masthead ?? undefined
    }
  }

  return {
    parts,
    has,
    length: L,
    beam,
    hull,
    spec,
    at,
    stern,
    bow,
    console,
    canopy,
    poles,
    flybridge,
    flyHelm,
    skyRoof,
    platform,
    zones,
    mast,
    seats,
    outboards,
    crew,
    spots: {
      ensign: spec.mounts.ensign.at,
      lantern: [stern + 0.08, sternY + 0.04, beam * 0.3],
      quarters: [quarter(1), quarter(-1)],
      fuel: [stern + 0.42, at(stern + 0.42).deck, hbAft * 0.5],
      crate: [stern + 0.46, at(stern + 0.46).deck, -hbAft * 0.48],
      tackle: [0.12 * L, at(0.12 * L).deck, -at(0.12 * L).hb * 0.55],
      traps: [-0.12 * L, at(-0.12 * L).deck, at(-0.12 * L).hb * 0.42],
      lifering,
      roof,
      antenna: antennaBase,
      masthead,
      lines,
      chest: [chestX, at(chestX).deck, 0.06],
      bow: [bow + 0.005, at(bow).y - 0.06, 0],
      nameplate: { x: 0.22 * L, y: at(0.22 * L).y - 0.07, hb: at(0.22 * L).hb }
    },
    top
  }
}
