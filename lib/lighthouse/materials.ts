import { Color, DoubleSide, MeshPhysicalMaterial, MeshStandardMaterial } from 'three'
import { grainBump, roofTileBump, roofTileMap, sandMap, stoneBump, stoneMap, woodMap } from './textures'

// One shared material library for every tile, so paint, stone, wood and clay read the same across the whole world.

export const PALETTE = {
  teal: '#25809a',
  tealDome: '#2b8ca5',
  cream: '#efe5d0',
  plaster: '#e9dcbd',
  stone: '#8d9498',
  stoneDark: '#6d7478',
  copper: '#b5733d',
  timber: '#563726',
  wood: '#8a5a36',
  terracotta: '#c1523a',
  glass: '#1b2830',
  foliage: '#4b7a31',
  foliageLight: '#8aac4f',
  rockTop: '#ead6ba',
  rockSide: '#d6aa8c',
  rockDeep: '#b98a74',
  sand: '#ead3a2',
  wetSand: '#c3a578',
  bird: '#f4f1ea'
} as const

function build() {
  const grain = grainBump()
  const paint = (color: string, extra: Partial<MeshPhysicalMaterial> = {}) =>
    Object.assign(
      new MeshPhysicalMaterial({
        color,
        roughness: 0.48,
        clearcoat: 0.25,
        clearcoatRoughness: 0.5,
        bumpMap: grain,
        bumpScale: 0.15
      }),
      extra
    )

  const roofMap = roofTileMap()
  const roofBump = roofTileBump()

  return {
    teal: paint(PALETTE.teal),
    tealDome: paint(PALETTE.tealDome, { clearcoat: 0.6, clearcoatRoughness: 0.25, roughness: 0.38 }),
    cream: paint(PALETTE.cream),
    plaster: new MeshStandardMaterial({ color: PALETTE.plaster, roughness: 0.92, bumpMap: grain, bumpScale: 0.6 }),
    trim: paint('#f3ecdc', { roughness: 0.55 }),
    stoneBase: new MeshStandardMaterial({
      map: stoneMap(),
      bumpMap: stoneBump(),
      bumpScale: 1.4,
      roughness: 0.85,
      color: '#f2f4f5'
    }),
    stone: new MeshStandardMaterial({ color: PALETTE.stone, roughness: 0.75, bumpMap: grain, bumpScale: 0.4 }),
    stoneDark: new MeshStandardMaterial({ color: PALETTE.stoneDark, roughness: 0.8 }),
    copper: new MeshStandardMaterial({ color: PALETTE.copper, metalness: 0.65, roughness: 0.38 }),
    timber: new MeshStandardMaterial({ color: PALETTE.timber, roughness: 0.8, bumpMap: grain, bumpScale: 0.5 }),
    wood: new MeshStandardMaterial({ color: PALETTE.wood, roughness: 0.82, bumpMap: grain, bumpScale: 0.6 }),
    boatWood: new MeshStandardMaterial({ map: woodMap(), roughness: 0.7, side: DoubleSide }),
    roof: new MeshStandardMaterial({
      map: roofMap,
      bumpMap: roofBump,
      bumpScale: 2.2,
      roughness: 0.72,
      color: '#ffffff'
    }),
    glass: new MeshPhysicalMaterial({
      color: PALETTE.glass,
      roughness: 0.15,
      metalness: 0,
      clearcoat: 1,
      emissive: new Color('#ff9a4a'),
      emissiveIntensity: 0.04
    }),
    lantern: new MeshPhysicalMaterial({
      color: '#2a2a24',
      roughness: 0.1,
      clearcoat: 1,
      emissive: new Color('#ffb066'),
      emissiveIntensity: 0.25
    }),
    lens: new MeshPhysicalMaterial({ color: '#a9dbe6', roughness: 0.08, clearcoat: 1, metalness: 0.1 }),
    rock: new MeshStandardMaterial({ vertexColors: true, roughness: 0.88, bumpMap: grain, bumpScale: 0.9 }),
    boulder: new MeshStandardMaterial({ vertexColors: true, roughness: 0.8, flatShading: true }),
    sand: new MeshStandardMaterial({
      vertexColors: true,
      map: sandMap(),
      roughness: 0.96,
      bumpMap: grain,
      bumpScale: 0.7
    }),
    foliage: new MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }),
    rope: new MeshStandardMaterial({ color: '#6b5640', roughness: 0.95 }),
    bird: new MeshStandardMaterial({ color: PALETTE.bird, roughness: 0.6, side: DoubleSide })
  }
}

export type Materials = ReturnType<typeof build>
let lib: Materials | null = null
/** The shared material library (created on first use, in the browser) */
export const materials = () => (lib ??= build())
