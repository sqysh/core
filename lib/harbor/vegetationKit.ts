import { BufferAttribute, BufferGeometry, CatmullRomCurve3, Color, IcosahedronGeometry, MeshStandardMaterial, TubeGeometry, Vector3 } from 'three'
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { fbm3, noise3, rng, smoothstep } from '../lighthouse/noise'

// Reusable coastal vegetation for the North Shore worlds, in the diorama's style (vertex-coloured, sculpted, one
// shared material each). Everything is seeded, so a scene looks the same on every load.
//
//  - dune grass: a clump of curved, tapered blades in muted green and gold, swaying in the wind (the material moves
//    each blade by its height, with a phase from where it stands, so no two clumps move together)
//  - windswept pine: a curved, irregular trunk with asymmetric limbs and sculpted foliage clusters, all leaning the
//    way the wind has shaped it

function paint(geo: BufferGeometry, pick: (p: Vector3, n: Vector3, out: Color) => void) {
  const pos = geo.getAttribute('position')
  const nrm = geo.getAttribute('normal')
  const col = new Float32Array(pos.count * 3)
  const p = new Vector3()
  const n = new Vector3()
  const c = new Color()
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i)
    n.fromBufferAttribute(nrm, i)
    pick(p, n, c)
    col.set([c.r, c.g, c.b], i * 3)
  }
  geo.setAttribute('color', new BufferAttribute(col, 3))
  return geo
}

// ─── dune grass ────────────────────────────────────────────────────────────────

const GREEN = new Color('#7d9b4a')
const GOLD = new Color('#c9b66a')
const BASE = new Color('#5c7a3a')

/** One clump of blades. `height` is the tallest blade; blades lean the way `lean` points, more at the tips. */
export function duneGrass(seed: number, height = 0.42, lean = 0.35) {
  const r = rng(seed)
  const blades: BufferGeometry[] = []
  const count = 12 + Math.floor(r() * 8)
  const leanDir = r() * Math.PI * 2
  for (let b = 0; b < count; b++) {
    const h = height * (0.5 + r() * 0.5)
    const w = 0.018 + r() * 0.014
    const a = r() * Math.PI * 2
    const root = 0.03 + r() * 0.08
    const bend = lean * (0.6 + r() * 0.8)
    const bx = Math.cos(leanDir) * bend + Math.cos(a) * 0.25
    const bz = Math.sin(leanDir) * bend + Math.sin(a) * 0.25
    const gold = r()
    // a curved, tapered quad strip: 5 segments, two-sided
    const segs = 5
    const pos: number[] = []
    const uv: number[] = []
    const col: number[] = []
    const idx: number[] = []
    const c = new Color()
    for (let i = 0; i <= segs; i++) {
      const t = i / segs
      const y = h * t
      const x = Math.cos(a) * root + bx * h * t * t
      const z = Math.sin(a) * root + bz * h * t * t
      const half = w * (1 - t * 0.9)
      // the blade's width runs across its lean
      const px = -Math.sin(a) * half
      const pz = Math.cos(a) * half
      pos.push(x - px, y, z - pz, x + px, y, z + pz)
      uv.push(0, t, 1, t)
      c.copy(BASE).lerp(GREEN, smoothstep(0, 0.5, t)).lerp(GOLD, smoothstep(0.45, 1, t) * (0.35 + 0.65 * gold))
      col.push(c.r, c.g, c.b, c.r, c.g, c.b)
      if (i < segs) {
        const k = i * 2
        idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3)
      }
    }
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3))
    g.setAttribute('uv', new BufferAttribute(new Float32Array(uv), 2))
    g.setAttribute('color', new BufferAttribute(new Float32Array(col), 3))
    g.setIndex(idx)
    blades.push(g.toNonIndexed())
  }
  const geo = mergeGeometries(blades)!
  geo.computeVertexNormals()
  return geo
}

/** The grass material: two-sided, with a wind sway driven by blade height (uv.y) and the clump's place in the world */
export function duneGrassMaterial(time: { value: number }) {
  const mat = new MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: 2 })
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = time
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        {
          // where this clump stands (so neighbours sway out of step), and how far up the blade we are
          vec2 where = vec2(0.0);
          #ifdef USE_INSTANCING
            where = vec2(instanceMatrix[3][0], instanceMatrix[3][2]);
          #endif
          float up = uv.y * uv.y;
          float gust = sin(uTime * 1.7 + where.x * 0.9 + where.y * 0.7) * 0.6 + sin(uTime * 2.9 + where.x * 2.3) * 0.4;
          transformed.x += gust * up * 0.07;
          transformed.z += gust * up * 0.035;
        }`
      )
  }
  return mat
}

// ─── windswept pine ────────────────────────────────────────────────────────────

const NEEDLE_DARK = new Color('#2f5a33')
const NEEDLE = new Color('#4a7d3c')
const NEEDLE_LIT = new Color('#7fa052')
const BARK = new Color('#5b4030')
const BARK_LIT = new Color('#7a583f')

type PineOpts = { seed: number; height?: number; lean?: number }

/** A coastal pine shaped by the wind: the trunk curves away from it, limbs reach downwind, foliage sits in layered clusters */
export function windsweptPine({ seed, height = 2.6, lean = 0.5 }: PineOpts) {
  const r = rng(seed)
  const windDir = r() * Math.PI * 2
  const wx = Math.cos(windDir)
  const wz = Math.sin(windDir)
  const parts: BufferGeometry[] = []

  // the trunk: a curve that bows into the wind low down then sweeps away with it
  const trunkPts: Vector3[] = []
  const bow = lean * height * 0.35
  for (let i = 0; i <= 6; i++) {
    const t = i / 6
    const sway = -Math.sin(t * Math.PI) * 0.15 * lean + t * t * 1.1
    trunkPts.push(new Vector3(wx * sway * bow + (r() - 0.5) * 0.05, height * 0.72 * t, wz * sway * bow + (r() - 0.5) * 0.05))
  }
  const trunkCurve = new CatmullRomCurve3(trunkPts)
  const trunk = new TubeGeometry(trunkCurve, 16, height * 0.04, 7, false)
  // taper the tube by hand (TubeGeometry has one radius)
  {
    const pos = trunk.getAttribute('position')
    for (let i = 0; i < pos.count; i++) {
      const seg = Math.floor(i / 8) / 16
      const p = trunkCurve.getPointAt(Math.min(1, seg))
      const k = 1 - seg * 0.6
      pos.setXYZ(i, p.x + (pos.getX(i) - p.x) * k, pos.getY(i), p.z + (pos.getZ(i) - p.z) * k)
    }
    trunk.computeVertexNormals()
  }
  trunk.deleteAttribute('uv')
  parts.push(paint(trunk, (p, n, out) => out.copy(BARK).lerp(BARK_LIT, smoothstep(-0.2, 0.9, n.x * -0.5 + n.y * 0.5) * 0.6 + noise3(p.x * 8, p.y * 8, p.z * 8, seed) * 0.1)))

  // limbs: three to five, mostly on the downwind side, each carrying a cluster of foliage
  const limbs = 3 + Math.floor(r() * 3)
  const clusters: { at: Vector3; size: number; stretch: number }[] = []
  for (let k = 0; k < limbs; k++) {
    const t = 0.45 + (k / limbs) * 0.5 + (r() - 0.5) * 0.08
    const base = trunkCurve.getPointAt(Math.min(1, t))
    const side = r() < 0.75 ? 1 : -1
    const a = windDir + side * (0.3 + r() * 0.9) * (r() < 0.5 ? 1 : -1) * (side > 0 ? 0.6 : 1)
    const len = height * (0.22 + r() * 0.25) * (side > 0 ? 1.3 : 0.8)
    const dir = new Vector3(Math.cos(a), 0.25 + r() * 0.3, Math.sin(a)).normalize()
    const tip = base.clone().addScaledVector(dir, len)
    tip.x += wx * len * 0.35
    tip.z += wz * len * 0.35
    const limb = new TubeGeometry(new CatmullRomCurve3([base, base.clone().lerp(tip, 0.5).add(new Vector3(0, len * 0.08, 0)), tip]), 6, height * 0.014, 5, false)
    limb.deleteAttribute('uv')
    parts.push(paint(limb, (_p, _n, out) => out.copy(BARK)))
    clusters.push({ at: tip, size: height * (0.16 + r() * 0.1) * (side > 0 ? 1.15 : 0.9), stretch: 1.4 + r() * 0.6 })
  }
  // the crown cluster, pushed downwind of the trunk's top
  const top = trunkCurve.getPointAt(1)
  clusters.push({ at: top.clone().add(new Vector3(wx * height * 0.08, height * 0.03, wz * height * 0.08)), size: height * 0.2, stretch: 1.3 })

  for (const c of clusters) {
    const g = new IcosahedronGeometry(c.size, 2)
    g.deleteAttribute('uv')
    g.deleteAttribute('normal')
    const m = mergeVertices(g)
    const pos = m.getAttribute('position')
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i)
      let y = pos.getY(i)
      let z = pos.getZ(i)
      // flattened, stretched downwind, lumpy
      const k = 1 + 0.22 * fbm3(x * 4, y * 4, z * 4, seed + 3)
      const along = (x * wx + z * wz) * (c.stretch - 1)
      x = (x + wx * along) * k
      z = (z + wz * along) * k
      y = y * k * 0.55
      pos.setXYZ(i, x + c.at.x, y + c.at.y, z + c.at.z)
    }
    m.computeVertexNormals()
    parts.push(
      paint(m, (p, n, out) =>
        out
          .copy(NEEDLE_DARK)
          .lerp(NEEDLE, smoothstep(-0.4, 0.6, n.y))
          .lerp(NEEDLE_LIT, Math.max(0, n.y * 0.6 - n.x * 0.3 + n.z * 0.2) * 0.7)
          .multiplyScalar(0.92 + 0.14 * noise3(p.x * 5, p.y * 5, p.z * 5, seed + 4))
      )
    )
  }
  return mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)))!
}

// ─── vines ─────────────────────────────────────────────────────────────────────

type VineOpts = {
  seed: number
  /** Where the vine takes root */
  start: Vector3
  /** The way it grows (need not be unit length) */
  dir: Vector3
  length: number
  /**
   * climb: creeps along a surface (pair with `cling`), its tip hanging free if `hang` > 0
   * drape: spills over a ledge and falls, swaying more toward its tip
   * wrap: spirals round `axis` (a post, a column, a corner of a building)
   */
  mode?: 'climb' | 'drape' | 'wrap'
  /** Leaves per unit length, roughly (1 is a modest vine) */
  density?: number
  /** Stem thickness */
  thickness?: number
  /** Leaf size multiplier */
  leaf?: number
  /** Share of a climbing vine's length (from the tip back) that hangs free and sways */
  hang?: number
  /** Direction the surface faces (leaves lie against it); default +z */
  face?: Vector3
  /** Pulls a free point onto the surface the vine clings to */
  cling?: (p: Vector3) => Vector3
  /** Keeps the vine out of somewhere (the QR code, a window) */
  constrain?: (p: Vector3) => Vector3
  /** wrap: the axis it spirals round, the spiral's radius and number of turns */
  axis?: Vector3
  radius?: number
  turns?: number
  /** Side tendrils */
  branches?: number
}

const LEAF_TONES = ['#4a7a35', '#5f9140', '#78a649', '#3f6a2e', '#8db551']
const STEM_BASE = new Color('#5a5233')
const STEM_TIP = new Color('#6f8a3d')

/**
 * A vine: twisting stems with side tendrils, small stylised leaves of varied size, angle and green, all in one
 * geometry with a per-vertex `sway` weight (use {@link vineMaterial}) so hanging sections move in the wind while rooted
 * ones stay put. Seeded, so it grows the same way every load. Works for rock faces (climb + cling), architecture
 * (wrap, or climb against a wall) and ledges (drape).
 */
export function vine(o: VineOpts): BufferGeometry {
  const r = rng(o.seed)
  const mode = o.mode ?? 'climb'
  const face = (o.face ?? new Vector3(0, 0, 1)).clone().normalize()
  const density = o.density ?? 1
  const leafScale = o.leaf ?? 1
  const hang = o.hang ?? (mode === 'climb' ? 0.25 : 0)
  const position: number[] = []
  const normal: number[] = []
  const color: number[] = []
  const sway: number[] = []
  const index: number[] = []
  const tmp = new Color()

  const swayAt = (t: number, kind: 'climb' | 'drape' | 'wrap') =>
    kind === 'drape' ? 0.15 + 0.85 * smoothstep(0, 1, t) : kind === 'wrap' ? 0.1 : 0.1 + (hang > 0 ? 0.9 * smoothstep(1 - hang - 0.08, 1, t) : 0)

  function stem(start: Vector3, dir: Vector3, length: number, kind: 'climb' | 'drape' | 'wrap', thick: number, branchDepth: number) {
    const step = 0.07
    const n = Math.max(4, Math.ceil(length / step))
    // the root takes hold of the surface it grows on
    const pts: Vector3[] = [o.cling && kind !== 'drape' ? o.cling(start) : start.clone()]
    const h = dir.clone().normalize()
    const side = new Vector3()
    if (kind === 'wrap') {
      const axis = (o.axis ?? new Vector3(0, 1, 0)).clone().normalize()
      const e1 = new Vector3(1, 0, 0).cross(axis).lengthSq() > 0.01 ? new Vector3(1, 0, 0).cross(axis).normalize() : new Vector3(0, 0, 1).cross(axis).normalize()
      const e2 = axis.clone().cross(e1)
      const radius = o.radius ?? 0.2
      const th0 = r() * Math.PI * 2
      const turns = o.turns ?? length * 0.8
      const centre = start.clone().addScaledVector(e1, -radius * Math.cos(th0)).addScaledVector(e2, -radius * Math.sin(th0))
      pts.length = 0
      for (let i = 0; i <= n; i++) {
        const t = i / n
        const th = th0 + t * turns * Math.PI * 2
        const rr = radius * (1 + 0.12 * Math.sin(t * 9 + o.seed))
        const p = centre.clone().addScaledVector(axis, t * length).addScaledVector(e1, Math.cos(th) * rr).addScaledVector(e2, Math.sin(th) * rr)
        pts.push(o.cling ? o.cling(p) : p)
      }
    } else {
      for (let i = 0; i < n; i++) {
        const t = i / n
        side.crossVectors(h, face).normalize()
        // meander, with a slow curl so the stem twists rather than zigzags
        h.addScaledVector(side, (r() - 0.5) * 0.7 + 0.35 * Math.sin(t * 7 + o.seed + branchDepth))
        if (kind === 'climb') h.addScaledVector(dir.clone().normalize(), 0.12)
        if (kind === 'drape') h.y -= 0.1 + 0.55 * t
        else if (hang > 0 && t > 1 - hang) h.y -= 0.5 * ((t - (1 - hang)) / hang)
        h.normalize()
        let p = pts[pts.length - 1].clone().addScaledVector(h, step)
        if (o.constrain) p = o.constrain(p)
        if (o.cling && !(kind === 'climb' && hang > 0 && t > 1 - hang * 0.7) && !(kind === 'drape' && t > 0.55)) {
          const q = o.cling(p)
          if (q === p) {
            // no surface here (the edge of the stone): turn back along the surface instead of growing into the air
            h.addScaledVector(side, -2 * h.dot(side)).normalize()
            const prev = pts[pts.length - 1]
            const cand = prev.clone().addScaledVector(h, step * 0.6)
            const back = o.cling(cand)
            // still nothing under it: hold position rather than hang in the air
            p = back === cand ? prev.clone() : back
          } else p = q
        }
        pts.push(p)
      }
    }
    // stem tube, tapering to the tip, greener toward it
    const curve = new CatmullRomCurve3(pts)
    const seg = Math.max(8, pts.length)
    const tube = new TubeGeometry(curve, seg, thick, 5, false)
    const tp = tube.getAttribute('position')
    const base = position.length / 3
    for (let i = 0; i < tp.count; i++) {
      const ring = Math.floor(i / 6) / seg
      const c = curve.getPointAt(Math.min(1, ring))
      const k = 1 - ring * 0.7
      position.push(c.x + (tp.getX(i) - c.x) * k, c.y + (tp.getY(i) - c.y) * k, c.z + (tp.getZ(i) - c.z) * k)
      normal.push(tube.getAttribute('normal').getX(i), tube.getAttribute('normal').getY(i), tube.getAttribute('normal').getZ(i))
      tmp.copy(STEM_BASE).lerp(STEM_TIP, ring)
      color.push(tmp.r, tmp.g, tmp.b)
      sway.push(swayAt(ring, kind))
    }
    for (let i = 0; i < tube.index!.count; i++) index.push(base + tube.index!.getX(i))

    // leaves: spaced along the stem, smaller toward the tip, each its own size, angle and shade
    const spacing = 1 / (density * 9)
    const total = curve.getLength()
    for (let s = 0.08; s < total * 0.98; s += spacing * (0.6 + r() * 0.8)) {
      const t = s / total
      const p = curve.getPointAt(t)
      const tan = curve.getTangentAt(t)
      const sideV = new Vector3().crossVectors(tan, face).normalize()
      if (!isFinite(sideV.x)) continue
      const phi = (r() < 0.5 ? 1 : -1) * (0.5 + r() * 1.0)
      const axisL = tan.clone().multiplyScalar(Math.cos(phi)).addScaledVector(sideV, Math.sin(phi)).normalize()
      const nrm = face.clone().addScaledVector(axisL, 0.25 + r() * 0.35).normalize()
      const len = (0.07 + r() * 0.07) * leafScale * (1 - 0.4 * t)
      const wid = len * (0.45 + r() * 0.2)
      const across = new Vector3().crossVectors(axisL, nrm).normalize()
      const b = p.clone().addScaledVector(face, 0.012)
      const mid = b.clone().addScaledVector(axisL, len * 0.45)
      const verts = [b, mid.clone().addScaledVector(across, wid * 0.5), b.clone().addScaledVector(axisL, len).addScaledVector(nrm, len * 0.12), mid.clone().addScaledVector(across, -wid * 0.5)]
      const tone = new Color(LEAF_TONES[Math.floor(r() * LEAF_TONES.length)]).multiplyScalar(0.92 + r() * 0.16)
      const sw = swayAt(t, kind)
      const i0 = position.length / 3
      verts.forEach((v, k) => {
        position.push(v.x, v.y, v.z)
        normal.push(nrm.x, nrm.y, nrm.z)
        tmp.copy(tone).lerp(new Color('#b7d36b'), k === 2 ? 0.3 : 0)
        if (k === 0) tmp.multiplyScalar(0.8)
        color.push(tmp.r, tmp.g, tmp.b)
        sway.push(sw * (k === 0 ? 0.6 : 1))
      })
      index.push(i0, i0 + 1, i0 + 2, i0, i0 + 2, i0 + 3)
    }

    // side tendrils, once
    if (branchDepth === 0) {
      const count = o.branches ?? Math.round(length * 1.2)
      for (let k = 0; k < count; k++) {
        const t = 0.15 + r() * 0.7
        const p = curve.getPointAt(t)
        const tan = curve.getTangentAt(t)
        const sideV = new Vector3().crossVectors(tan, face).normalize()
        const ang = (r() < 0.5 ? 1 : -1) * (0.7 + r() * 0.6)
        const d = tan.clone().multiplyScalar(Math.cos(ang)).addScaledVector(sideV, Math.sin(ang))
        stem(p, d, 0.25 + r() * 0.45, kind === 'wrap' ? 'climb' : kind, thick * 0.55, 1)
      }
    }
  }

  stem(o.start, o.dir, o.length, mode, o.thickness ?? 0.016, 0)
  const geo = new BufferGeometry()
  geo.setAttribute('position', new BufferAttribute(new Float32Array(position), 3))
  geo.setAttribute('normal', new BufferAttribute(new Float32Array(normal), 3))
  geo.setAttribute('color', new BufferAttribute(new Float32Array(color), 3))
  geo.setAttribute('sway', new BufferAttribute(new Float32Array(sway), 1))
  geo.setIndex(index)
  return geo
}

/** Vine material: two-sided, vertex-coloured, with hanging parts (the `sway` weight) moving gently in the wind */
export function vineMaterial(time: { value: number }) {
  const mat = new MeshStandardMaterial({ vertexColors: true, roughness: 0.85, side: 2 })
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = time
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nattribute float sway;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        {
          vec3 wp = (modelMatrix * vec4(transformed, 1.0)).xyz;
          float gust = sin(uTime * 1.4 + wp.x * 0.8 + wp.y * 1.2) * 0.6 + sin(uTime * 2.3 + wp.z * 1.1 + wp.x * 0.5) * 0.4;
          transformed.x += gust * sway * 0.055;
          transformed.z += gust * sway * 0.03;
          transformed.y += abs(gust) * sway * -0.012;
        }`
      )
  }
  return mat
}

/**
 * A copy of a foliage material that sways in the wind: the crown moves more the higher it is above its base, in a
 * rolling gust that travels across the land (so neighbouring trees don't move in step), plus a quicker flutter at the
 * tips. `amp` is the sway in world units per unit of height^1.5. The base stays put. Works on any geometry whose origin
 * is at its foot, which every tree and shrub here is.
 */
export function swayMaterial<M extends MeshStandardMaterial>(base: M, time: { value: number }, amp: number): M {
  const m = base.clone() as M
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uSwayTime = time
    shader.uniforms.uSwayAmp = { value: amp }
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uSwayTime, uSwayAmp;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        {
          vec3 wp0 = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
          float lift = pow(max(position.y, 0.0), 1.5);
          // a gust rolls across the land from the south-west, with a slow lean and a quicker flutter on top
          float gust = 0.5 + 0.5 * sin(uSwayTime * 0.7 - (wp0.x * 0.35 + wp0.z * 0.2));
          float lean = (0.35 + 0.65 * gust) * uSwayAmp * lift;
          float flutter = sin(uSwayTime * 2.3 + position.x * 5.0 + position.z * 4.0 + wp0.x) * 0.25 * uSwayAmp * lift;
          transformed.x += lean * 0.9 + flutter;
          transformed.z += lean * 0.45 - flutter * 0.6;
        }`
      )
  }
  return m
}
