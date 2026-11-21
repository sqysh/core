'use client'

import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import {
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  CapsuleGeometry,
  ConeGeometry,
  CatmullRomCurve3,
  Color,
  DoubleSide,
  Mesh,
  Material,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Quaternion,
  RepeatWrapping,
  SphereGeometry,
  SRGBColorSpace,
  TubeGeometry,
  Vector3
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { Finish, SailPattern } from '@/lib/vessel/catalog'
import { isBlack, paintFill } from '../../_lib/vessel/paint'
import { submerged, SUBMERGED_ORDER } from '../../_lib/vessel/submerged'
import { grainBump } from '../../../lighthouse/_lib/textures'
import { rng } from '../../../lighthouse/_lib/noise'

// The shared kit every boat is built from: glossy enamel paints, varnished teak, sailcloth, chrome, glass, rope, and
// small fittings (crew, rails, fenders, portholes, life rings). Materials are cached, so 15 boats share a handful.

const cache = new Map<string, Material>()
const cached = <T extends Material>(key: string, make: () => T) =>
  (cache.get(key) as T) ?? (cache.set(key, make()).get(key) as T)

/** Pull a cartoon-bright board colour gently toward the world's warm, slightly dusty palette */
export const harmonize = (hex: string, amount = 0.12) =>
  // true black stays black: a black boat must read as black, not as a dusty brown
  isBlack(hex) ? hex : '#' + new Color(hex).lerp(new Color('#d9ccb4'), amount).getHexString()

/** How paint is finished: gloss is the clear-coated look the harbor always had; matte barely reflects at all */
const FINISH = {
  gloss: { roughness: 0.32, clearcoat: 0.8, clearcoatRoughness: 0.18 },
  satin: { roughness: 0.55, clearcoat: 0.22, clearcoatRoughness: 0.5 },
  matte: { roughness: 0.96, clearcoat: 0, specularIntensity: 0.3, envMapIntensity: 0.35 }
} satisfies Record<Finish, object>

/** Boat enamel: glossy, with a clear coat that catches the key light */
export const enamel = (hex: string, finish: Finish = 'gloss') =>
  cached(
    `enamel:${hex}:${finish}`,
    () => new MeshPhysicalMaterial({ color: paintFill(harmonize(hex)), ...FINISH[finish] })
  )

export const hullEnamel = (map: CanvasTexture, finish: Finish = 'gloss') =>
  cached(
    `hull:${map.uuid}:${finish}`,
    () =>
      new MeshPhysicalMaterial({
        map,
        side: DoubleSide,
        // the hull's gloss is a touch deeper than the fittings' (as it always was)
        ...(finish === 'gloss' ? { roughness: 0.3, clearcoat: 0.9, clearcoatRoughness: 0.15 } : FINISH[finish])
      })
  )

function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, repeat = true) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  draw(c.getContext('2d')!)
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  if (repeat) t.wrapS = t.wrapT = RepeatWrapping
  t.anisotropy = 8
  return t
}

let teakTex: CanvasTexture | null = null
/** Narrow honey-coloured planks with black caulking seams, running fore and aft */
function teak() {
  return (teakTex ??= canvasTex(256, 256, (g) => {
    const r = rng(17)
    const planks = 10
    const ph = 256 / planks
    for (let i = 0; i < planks; i++) {
      const s = 0.88 + r() * 0.2
      g.fillStyle = `rgb(${Math.round(201 * s)},${Math.round(146 * s)},${Math.round(84 * s)})`
      g.fillRect(0, i * ph, 256, ph)
      for (let k = 0; k < 8; k++) {
        g.strokeStyle = `rgba(110,60,20,${0.1 + r() * 0.12})`
        const y = i * ph + r() * ph
        g.beginPath()
        g.moveTo(0, y)
        g.bezierCurveTo(90, y + (r() - 0.5) * 3, 170, y + (r() - 0.5) * 3, 256, y)
        g.stroke()
      }
      g.fillStyle = 'rgba(30,18,10,0.85)'
      g.fillRect(0, i * ph, 256, 1.5)
      // butt joints
      const bx = r() * 256
      g.fillRect(bx, i * ph, 1.5, ph)
    }
  }))
}

const sailTex = new Map<string, CanvasTexture>()
/**
 * Sailcloth in a member's colours: the sail colour, its pattern in the accent colour, then horizontal panel seams, a
 * hint of weave and darker batten pockets over the top. The sail's uv runs v = 0 at the foot to 1 at the head.
 */
function sailcloth(colour: string, pattern: SailPattern, accent: string) {
  const key = `${colour}|${pattern}|${accent}`
  const hit = sailTex.get(key)
  if (hit) return hit
  const tex = canvasTex(
    256,
    256,
    (g) => {
      g.fillStyle = paintFill(harmonize(colour, 0.05))
      g.fillRect(0, 0, 256, 256)
      // canvas y runs down from the head; v measured up from the foot
      const band = (v0: number, v1: number) => g.fillRect(0, 256 * (1 - v1), 256, 256 * (v1 - v0))
      g.fillStyle = paintFill(harmonize(accent, 0.08))
      if (pattern === 'band') band(0.1, 0.26)
      if (pattern === 'stripes') {
        band(0.14, 0.19)
        band(0.24, 0.29)
      }
      const r = rng(5)
      for (let i = 0; i < 2500; i++) {
        g.fillStyle = `rgba(150,140,120,${r() * 0.06})`
        g.fillRect(r() * 256, r() * 256, 1, 1)
      }
      g.strokeStyle = 'rgba(120,110,90,0.35)'
      g.lineWidth = 1.5
      for (let y = 18; y < 256; y += 26) {
        g.beginPath()
        g.moveTo(0, y)
        g.lineTo(256, y + 6)
        g.stroke()
      }
      g.strokeStyle = 'rgba(110,100,85,0.45)'
      g.lineWidth = 4
      for (const y of [60, 130, 200]) {
        g.beginPath()
        g.moveTo(256, y)
        g.lineTo(150, y + 10)
        g.stroke()
      }
    },
    false
  )
  sailTex.set(key, tex)
  return tex
}

export const kit = () => ({
  teak: cached(
    'teak',
    () => new MeshStandardMaterial({ map: teak(), roughness: 0.62, bumpMap: grainBump(), bumpScale: 0.4 })
  ),
  varnish: cached('varnish', () => new MeshPhysicalMaterial({ color: '#a8622d', roughness: 0.35, clearcoat: 0.7 })),
  chrome: cached('chrome', () => new MeshStandardMaterial({ color: '#e8ecef', metalness: 1, roughness: 0.18 })),
  steel: cached('steel', () => new MeshStandardMaterial({ color: '#9aa3a8', metalness: 0.7, roughness: 0.35 })),
  rubber: cached('rubber', () => new MeshStandardMaterial({ color: '#23272b', roughness: 0.75 })),
  glass: cached(
    'glass',
    () =>
      new MeshPhysicalMaterial({
        color: '#1e3440',
        roughness: 0.06,
        clearcoat: 1,
        metalness: 0.2,
        envMapIntensity: 1.6
      })
  ),
  tint: cached(
    'tint',
    () =>
      new MeshPhysicalMaterial({
        color: '#8fc2d0',
        roughness: 0.04,
        transparent: true,
        opacity: 0.45,
        clearcoat: 1,
        side: DoubleSide
      })
  ),
  rope: cached('rope', () => new MeshStandardMaterial({ color: '#cbb48d', roughness: 0.95 })),
  darkRope: cached('darkRope', () => new MeshStandardMaterial({ color: '#4b3d2e', roughness: 0.95 })),
  white: cached('white', () => new MeshPhysicalMaterial({ color: '#f5f1e8', roughness: 0.35, clearcoat: 0.6 })),
  cushion: (hex: string) =>
    cached(
      `cushion:${hex}`,
      () => new MeshStandardMaterial({ color: paintFill(harmonize(hex, 0.2)), roughness: 0.75 })
    ),
  sail: (hex: string, pattern: SailPattern = 'plain', accent = '#ffffff') =>
    cached(
      `sail:${hex}|${pattern}|${accent}`,
      () => new MeshStandardMaterial({ map: sailcloth(hex, pattern, accent), roughness: 0.9, side: DoubleSide })
    ),
  /** Below the waterline: bronze propellers, galvanised ground tackle and its chain */
  bronze: cached('bronze', () => new MeshStandardMaterial({ color: '#b98a4e', metalness: 0.85, roughness: 0.32 })),
  galvanised: cached(
    'galvanised',
    () => new MeshStandardMaterial({ color: '#a3aaae', metalness: 0.75, roughness: 0.42 })
  ),
  chain: cached('chain', () => new MeshStandardMaterial({ color: '#5f666b', metalness: 0.6, roughness: 0.55 })),
  flag: (hex: string) =>
    cached(
      `flag:${hex}`,
      () => new MeshStandardMaterial({ color: paintFill(harmonize(hex, 0.05)), roughness: 0.8, side: DoubleSide })
    ),
  skin: cached('skin', () => new MeshStandardMaterial({ color: '#e7b48f', roughness: 0.65 })),
  navLightRed: cached(
    'navR',
    () => new MeshStandardMaterial({ color: '#ff4a3d', emissive: new Color('#ff3020'), emissiveIntensity: 2.2 })
  ),
  navLightGreen: cached(
    'navG',
    () => new MeshStandardMaterial({ color: '#3dff7a', emissive: new Color('#20ff60'), emissiveIntensity: 2.2 })
  ),
  orange: cached('orange', () => new MeshPhysicalMaterial({ color: '#ec7a35', roughness: 0.35, clearcoat: 0.6 }))
})

/** A thin rod or rail through points */
export function Rail({
  points,
  r = 0.012,
  material,
  closed = false
}: {
  points: [number, number, number][]
  r?: number
  material: Material
  closed?: boolean
}) {
  const geo = useMemo(
    () =>
      new TubeGeometry(
        new CatmullRomCurve3(
          points.map((p) => new Vector3(...p)),
          closed,
          'catmullrom',
          0.1
        ),
        Math.max(8, points.length * 6),
        r,
        6,
        closed
      ),
    // points are literals built per render; their JSON is a stable key
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(points), r, closed]
  )
  return <mesh geometry={geo} material={material} castShadow />
}

/** A straight rod between two points */
export function Rod({
  a,
  b,
  r = 0.01,
  material
}: {
  a: [number, number, number]
  b: [number, number, number]
  r?: number
  material: Material
}) {
  const { mid, len, quat } = useMemo(() => {
    const va = new Vector3(...a)
    const vb = new Vector3(...b)
    const dir = vb.clone().sub(va)
    const q = new Vector3(0, 1, 0)
    const quat = new Quaternion().setFromUnitVectors(q, dir.clone().normalize())
    return { mid: va.add(vb).multiplyScalar(0.5), len: dir.length(), quat }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a.join(), b.join()])
  return (
    <mesh position={mid} quaternion={quat} material={material} castShadow>
      <cylinderGeometry args={[r, r, len, 6]} />
    </mesh>
  )
}

/** A white fender hanging over the side on a short line */
export function Fender({ at, material }: { at: [number, number, number]; material?: Material }) {
  const k = kit()
  return (
    <group position={at}>
      <mesh material={material ?? k.white} position={[0, -0.09, 0]} castShadow>
        <capsuleGeometry args={[0.035, 0.08, 6, 12]} />
      </mesh>
      <mesh material={k.rope} position={[0, 0, 0]}>
        <cylinderGeometry args={[0.004, 0.004, 0.06, 4]} />
      </mesh>
    </group>
  )
}

// The small fittings each build one merged geometry per material, cached by size, so a 30-boat harbor pays one draw
// per fitting rather than one per part.
const geoCache = new Map<string, BufferGeometry>()
function merged(key: string, parts: () => BufferGeometry[]) {
  const hit = geoCache.get(key)
  if (hit) return hit
  const g = mergeGeometries(parts().map((p) => (p.deleteAttribute('uv'), p.index ? p.toNonIndexed() : p)))!
  geoCache.set(key, g)
  return g
}

/** A deck cleat: two horns on a low base, lying fore and aft */
export function Cleat({ at, size = 1 }: { at: [number, number, number]; size?: number }) {
  const geo = merged('cleat', () => {
    const base = new BoxGeometry(0.03, 0.016, 0.018)
    base.translate(0, 0.008, 0)
    const horns = new CapsuleGeometry(0.007, 0.06, 4, 8)
    horns.rotateZ(Math.PI / 2)
    horns.translate(0, 0.02, 0)
    return [base, horns]
  })
  return <mesh geometry={geo} material={kit().chrome} position={at} scale={size} />
}

/** The stainless bow roller the anchor stows in: two cheek plates and a roller, pointing out over the stem */
export function BowRoller({ at }: { at: [number, number, number] }) {
  const k = kit()
  const cheeks = merged('roller-cheeks', () =>
    [-1, 1].map((side) => {
      const g = new BoxGeometry(0.14, 0.03, 0.006)
      g.translate(-0.02, -0.004, side * 0.024)
      return g
    })
  )
  return (
    <group position={at}>
      <mesh geometry={cheeks} material={k.chrome} castShadow />
      <mesh material={k.rubber} position={[0.04, -0.004, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.011, 0.011, 0.04, 10]} />
      </mesh>
    </group>
  )
}

/**
 * A propeller of `blades` pitched blades on a hub, turning about the x axis. `spin` is a live value (the rig's prop,
 * roughly -1..1) so it turns with the way the boat is making and stops at anchor.
 */
export function Propeller({
  at,
  r,
  blades = 3,
  spin
}: {
  at: [number, number, number]
  r: number
  blades?: number
  spin: { prop: number }
}) {
  const ref = useRef<Mesh>(null)
  const geo = merged(`prop:${r}:${blades}`, () => {
    const hub = new ConeGeometry(r * 0.28, r * 0.7, 10)
    hub.rotateZ(Math.PI / 2)
    const parts: BufferGeometry[] = [hub]
    for (let i = 0; i < blades; i++) {
      const blade = new SphereGeometry(r * 0.48, 10, 6)
      blade.scale(1, 1, 0.22)
      blade.rotateX(0.55)
      blade.translate(0, r * 0.55, 0)
      blade.rotateX((i / blades) * Math.PI * 2)
      parts.push(blade)
    }
    return parts
  })
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.x += spin.prop * 28 * Math.min(dt, 0.05)
  })
  const bronze = kit().bronze
  return (
    <mesh ref={ref} geometry={geo} material={bronze} position={at}>
      <mesh geometry={geo} material={submerged(bronze)} renderOrder={SUBMERGED_ORDER} />
    </mesh>
  )
}

/** A part that sits below the waterline: drawn as usual, and again over the water so it shows down through it */
export function Wet({
  geometry,
  material,
  position,
  rotation
}: {
  geometry: BufferGeometry
  material: MeshStandardMaterial
  position?: [number, number, number]
  rotation?: [number, number, number]
}) {
  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={geometry} material={material} />
      <mesh geometry={geometry} material={submerged(material)} renderOrder={SUBMERGED_ORDER} />
    </group>
  )
}

/** A chrome-ringed porthole facing +z (rotate to place) */
export function Porthole({ r = 0.032 }: { r?: number }) {
  const k = kit()
  return (
    <group>
      <mesh material={k.chrome} rotation={[0, 0, 0]}>
        <torusGeometry args={[r, r * 0.28, 8, 20]} />
      </mesh>
      <mesh material={k.glass} position={[0, 0, -0.004]}>
        <circleGeometry args={[r, 20]} />
      </mesh>
    </group>
  )
}

/** A red-and-white life ring facing +z */
export function LifeRing({ r = 0.07, accent }: { r?: number; accent: string }) {
  const k = kit()
  const paint = enamel(accent)
  return (
    <group>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} material={i % 2 ? k.white : paint} rotation={[0, 0, (i * Math.PI) / 2]} castShadow>
          <torusGeometry args={[r, r * 0.32, 8, 10, Math.PI / 2]} />
        </mesh>
      ))}
    </group>
  )
}

type Hat = 'cap' | 'souwester' | 'sunhat' | 'beanie'

/** A deckhand: torso, arms, head and a hat, about 0.4 tall — a little character, not a mannequin */
export function Crew({
  at,
  turn = 0,
  coat,
  hat = 'cap',
  hatColor,
  pose = 'stand'
}: {
  at: [number, number, number]
  turn?: number
  coat: string
  hat?: Hat
  hatColor: string
  pose?: 'stand' | 'helm' | 'wave'
}) {
  const k = kit()
  const coatMat = enamel(coat)
  const hatMat = enamel(hatColor)
  const armUp = pose === 'wave'
  return (
    <group position={at} rotation={[0, turn, 0]}>
      {/* legs */}
      <mesh material={k.rubber} position={[0, 0.07, 0]} castShadow>
        <capsuleGeometry args={[0.042, 0.07, 4, 10]} />
      </mesh>
      {/* torso */}
      <mesh material={coatMat} position={[0, 0.19, 0]} castShadow>
        <capsuleGeometry args={[0.058, 0.1, 6, 14]} />
      </mesh>
      {/* arms */}
      <mesh
        material={coatMat}
        position={[0.035, 0.19, 0.068]}
        rotation={[pose === 'helm' ? 0.2 : 0.15, 0, pose === 'helm' ? -1.1 : -0.25]}
        castShadow
      >
        <capsuleGeometry args={[0.02, 0.09, 4, 8]} />
      </mesh>
      <mesh
        material={coatMat}
        position={armUp ? [0, 0.3, -0.07] : [0.035, 0.19, -0.068]}
        rotation={armUp ? [0.5, 0, 0.1] : [-0.15, 0, pose === 'helm' ? -1.1 : -0.25]}
        castShadow
      >
        <capsuleGeometry args={[0.02, 0.09, 4, 8]} />
      </mesh>
      {/* head */}
      <mesh material={k.skin} position={[0, 0.315, 0]} castShadow>
        <sphereGeometry args={[0.05, 16, 12]} />
      </mesh>
      {hat === 'cap' && (
        <>
          <mesh material={hatMat} position={[0, 0.335, 0]} castShadow>
            <sphereGeometry args={[0.052, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          </mesh>
          <mesh material={hatMat} position={[0.045, 0.336, 0]}>
            <boxGeometry args={[0.05, 0.008, 0.07]} />
          </mesh>
        </>
      )}
      {hat === 'souwester' && (
        <>
          <mesh material={hatMat} position={[0, 0.34, 0]} castShadow>
            <sphereGeometry args={[0.055, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          </mesh>
          <mesh material={hatMat} position={[-0.01, 0.335, 0]} rotation={[0, 0, 0.12]}>
            <cylinderGeometry args={[0.085, 0.09, 0.008, 18]} />
          </mesh>
        </>
      )}
      {hat === 'sunhat' && (
        <>
          <mesh material={hatMat} position={[0, 0.35, 0]} castShadow>
            <cylinderGeometry args={[0.04, 0.05, 0.04, 16]} />
          </mesh>
          <mesh material={hatMat} position={[0, 0.333, 0]}>
            <cylinderGeometry args={[0.1, 0.1, 0.006, 20]} />
          </mesh>
        </>
      )}
      {hat === 'beanie' && (
        <mesh material={hatMat} position={[0, 0.335, 0]} castShadow>
          <sphereGeometry args={[0.054, 16, 8, 0, Math.PI * 2, 0, Math.PI / 1.9]} />
        </mesh>
      )}
    </group>
  )
}
