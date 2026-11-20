'use client'

import { useMemo } from 'react'
import {
  CanvasTexture,
  CatmullRomCurve3,
  Color,
  DoubleSide,
  Material,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Quaternion,
  RepeatWrapping,
  SRGBColorSpace,
  TubeGeometry,
  Vector3
} from 'three'
import { grainBump } from '../../../lighthouse/_lib/textures'
import { rng } from '../../../lighthouse/_lib/noise'

// The shared kit every boat is built from: glossy enamel paints, varnished teak, sailcloth, chrome, glass, rope, and
// small fittings (crew, rails, fenders, portholes, life rings). Materials are cached, so 15 boats share a handful.

const cache = new Map<string, Material>()
const cached = <T extends Material>(key: string, make: () => T) => (cache.get(key) as T) ?? (cache.set(key, make()).get(key) as T)

/** Pull a cartoon-bright board colour gently toward the world's warm, slightly dusty palette */
export const harmonize = (hex: string, amount = 0.12) => '#' + new Color(hex).lerp(new Color('#d9ccb4'), amount).getHexString()

/** Boat enamel: glossy, with a clear coat that catches the key light */
export const enamel = (hex: string) =>
  cached(`enamel:${hex}`, () => new MeshPhysicalMaterial({ color: harmonize(hex), roughness: 0.32, clearcoat: 0.8, clearcoatRoughness: 0.18 }))

export const hullEnamel = (map: CanvasTexture) =>
  cached(`hull:${map.uuid}`, () =>
    new MeshPhysicalMaterial({ map, roughness: 0.3, clearcoat: 0.9, clearcoatRoughness: 0.15, side: DoubleSide })
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

let sailTex: CanvasTexture | null = null
/** Sailcloth: horizontal panel seams, a hint of weave and darker batten pockets */
function sailcloth() {
  return (sailTex ??= canvasTex(256, 256, (g) => {
    g.fillStyle = '#ffffff'
    g.fillRect(0, 0, 256, 256)
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
  }, false))
}

export const kit = () => ({
  teak: cached('teak', () => new MeshStandardMaterial({ map: teak(), roughness: 0.62, bumpMap: grainBump(), bumpScale: 0.4 })),
  varnish: cached('varnish', () => new MeshPhysicalMaterial({ color: '#a8622d', roughness: 0.35, clearcoat: 0.7 })),
  chrome: cached('chrome', () => new MeshStandardMaterial({ color: '#e8ecef', metalness: 1, roughness: 0.18 })),
  steel: cached('steel', () => new MeshStandardMaterial({ color: '#9aa3a8', metalness: 0.7, roughness: 0.35 })),
  rubber: cached('rubber', () => new MeshStandardMaterial({ color: '#23272b', roughness: 0.75 })),
  glass: cached('glass', () =>
    new MeshPhysicalMaterial({ color: '#1e3440', roughness: 0.06, clearcoat: 1, metalness: 0.2, envMapIntensity: 1.6 })
  ),
  tint: cached('tint', () =>
    new MeshPhysicalMaterial({ color: '#8fc2d0', roughness: 0.04, transparent: true, opacity: 0.45, clearcoat: 1, side: DoubleSide })
  ),
  rope: cached('rope', () => new MeshStandardMaterial({ color: '#cbb48d', roughness: 0.95 })),
  darkRope: cached('darkRope', () => new MeshStandardMaterial({ color: '#4b3d2e', roughness: 0.95 })),
  white: cached('white', () => new MeshPhysicalMaterial({ color: '#f5f1e8', roughness: 0.35, clearcoat: 0.6 })),
  cushion: (hex: string) => cached(`cushion:${hex}`, () => new MeshStandardMaterial({ color: harmonize(hex, 0.2), roughness: 0.75 })),
  sail: (hex: string) =>
    cached(`sail:${hex}`, () => new MeshStandardMaterial({ map: sailcloth(), color: harmonize(hex, 0.05), roughness: 0.9, side: DoubleSide })),
  flag: (hex: string) => cached(`flag:${hex}`, () => new MeshStandardMaterial({ color: harmonize(hex, 0.05), roughness: 0.8, side: DoubleSide })),
  skin: cached('skin', () => new MeshStandardMaterial({ color: '#e7b48f', roughness: 0.65 })),
  navLightRed: cached('navR', () => new MeshStandardMaterial({ color: '#ff4a3d', emissive: new Color('#ff3020'), emissiveIntensity: 2.2 })),
  navLightGreen: cached('navG', () => new MeshStandardMaterial({ color: '#3dff7a', emissive: new Color('#20ff60'), emissiveIntensity: 2.2 })),
  orange: cached('orange', () => new MeshPhysicalMaterial({ color: '#ec7a35', roughness: 0.35, clearcoat: 0.6 }))
})

/** A thin rod or rail through points */
export function Rail({ points, r = 0.012, material, closed = false }: { points: [number, number, number][]; r?: number; material: Material; closed?: boolean }) {
  const geo = useMemo(
    () => new TubeGeometry(new CatmullRomCurve3(points.map((p) => new Vector3(...p)), closed, 'catmullrom', 0.1), Math.max(8, points.length * 6), r, 6, closed),
    // points are literals built per render; their JSON is a stable key
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(points), r, closed]
  )
  return <mesh geometry={geo} material={material} castShadow />
}

/** A straight rod between two points */
export function Rod({ a, b, r = 0.01, material }: { a: [number, number, number]; b: [number, number, number]; r?: number; material: Material }) {
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
      <mesh material={coatMat} position={[0.035, 0.19, 0.068]} rotation={[pose === 'helm' ? 0.2 : 0.15, 0, pose === 'helm' ? -1.1 : -0.25]} castShadow>
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
