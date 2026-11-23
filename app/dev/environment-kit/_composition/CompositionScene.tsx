'use client'

import { OrbitControls } from '@react-three/drei'
import { ThreeEvent, useFrame, useThree } from '@react-three/fiber'
import { Bloom, EffectComposer, N8AO, SMAA, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { memo, MutableRefObject, useLayoutEffect, useMemo, useRef } from 'react'
import { Box3, Material, Mesh, MeshBasicMaterial, Object3D, OrthographicCamera, Vector3 } from 'three'
import { Boat } from '@/app/dev/checkin-voyage/_components/boats/Boats'
import type { Rig } from '@/app/dev/checkin-voyage/_lib/store'
import { lookOf } from '@/app/dev/checkin-voyage/_lib/vessel/look'
import { CoastalTile } from '@/app/dev/lighthouse/_components/CoastalTile'
import { Cottage } from '@/app/dev/lighthouse/_components/Cottage'
import { Lighthouse } from '@/app/dev/lighthouse/_components/Lighthouse'
import { StudioLighting } from '@/app/dev/lighthouse/_components/StudioLighting'
import { LanternStyle } from '@/app/dev/lighthouse/_lib/lanternStyle'
import { WATER_Y } from '@/app/dev/lighthouse/_lib/world'
import { useAssetBuild } from '@/lib/environment/EnvironmentAsset'
import { GroundAnchor, placeOnGround, ringFootprint } from '@/lib/environment/core/placement'
import { ASSETS } from '@/lib/environment/registry'
import { VesselConfig } from '@/lib/vessel/catalog'
import { FrameStats, RenderStats } from '../_components/RenderStats'
import { RigAdjust } from '../_components/RigAdjust'
import { DEFAULT_SETTINGS } from '../_components/settings'
import { CompositionItem, compositionShore, compositionTerrain, CompositionView, positionOf } from './layout'

// The composition's scene: the world's lighting rig and finish, the island on one of the world's coastal tiles, and
// every item grounded on its sand. The world's own pieces are drawn by their own components, untouched; model assets
// by their recipes, scaled to their share of the lighthouse. It measures the lighthouse as drawn (the scale everything
// else is set against) and, a few times a second, how tall each item stands on screen.

const DEG = Math.PI / 180

/** The world's pieces measured as built (size 1): height, and width and depth across the ground */
export type Measured = Record<string, { height: number; width: number; depth: number }>
/** How tall each item stands on screen, as a share of the view's height */
export type ScreenSizes = Record<string, number>

export type CompositionSettings = { finish: boolean; shadows: boolean; wireframe: boolean; footprints: boolean }

/** The lighthouse's height before it's been measured (its tower and lantern as laid out in lighthouseTile.ts) */
export const LIGHTHOUSE_ESTIMATE = 13

const VESSEL_LOOK = (vessel: VesselConfig['vesselClass']) =>
  lookOf({
    vesselClass: vessel,
    hullColor: '#2f5d8a',
    trimColor: '#f4efe6',
    accentColor: '#c8452f',
    sailColor: '#f6f1e7',
    sailPattern: 'plain',
    accessories: ['ensign'],
    details: { cabinColor: '#fbf6ec', roofColor: '#2f5d8a' }
  })
/** Moored: sails stowed, propeller still */
const MOORED: Rig = { hoist: 0, moored: true, prop: 0 }

/** Footprints of the world's pieces as built, for grounding them: rings round their bases */
const FOOTPRINTS: Record<'lighthouse' | 'cottage', [number, number]> = {
  lighthouse: [1.45, 1.45],
  cottage: [1.25, 0.9]
}

/** Bounds of what's drawn solid (not glows, beams or glass that writes no depth) */
function solidBounds(root: Object3D) {
  const box = new Box3()
  const part = new Box3()
  root.updateWorldMatrix(true, true)
  root.traverse((o) => {
    const m = o as Mesh
    if (!m.isMesh || !m.geometry) return
    const mats = (Array.isArray(m.material) ? m.material : [m.material]) as Material[]
    if (mats.every((mt) => mt.transparent && !mt.depthWrite)) return
    if (!m.geometry.boundingBox) m.geometry.computeBoundingBox()
    part.copy(m.geometry.boundingBox!).applyMatrix4(m.matrixWorld)
    box.union(part)
  })
  return box
}

const wire = new MeshBasicMaterial({
  color: '#7fd3ff',
  wireframe: true,
  transparent: true,
  opacity: 0.35,
  depthWrite: false
})
const ringMaterial = new MeshBasicMaterial({ color: '#7fd3ff', transparent: true, opacity: 0.85, depthTest: false })

/** Grounds something at a scale: its footprint and embedding scaled with it */
function placeScaled(anchor: GroundAnchor, scale: number, embed: number, x: number, z: number, yaw: number) {
  return placeOnGround(
    compositionTerrain,
    {
      footprint: anchor.footprint.map(([fx, fz]) => [fx * scale, fz * scale] as [number, number]),
      embed,
      maxTilt: anchor.maxTilt
    },
    x,
    z,
    yaw
  )
}

/** A ring on the ground round the selected item */
function SelectionRing({ x, z, radius }: { x: number; z: number; radius: number }) {
  const y = compositionTerrain.height(x, z) + 0.04
  return (
    <mesh position={[x, y, z]} rotation={[-Math.PI / 2, 0, 0]} material={ringMaterial} renderOrder={10}>
      <ringGeometry args={[radius, radius + 0.06, 64]} />
    </mesh>
  )
}

type ItemProps = {
  item: CompositionItem
  lighthouseHeight: number
  measured: Measured
  settings: CompositionSettings
  selected: boolean
  register: (id: string, o: Object3D | null) => void
  onSelect: (id: string) => void
}

/** One of the world's own pieces: the lighthouse, the cottage or a vessel */
function WorldPiece({ item, measured, settings, selected, register, onSelect }: ItemProps) {
  const [x, z] = positionOf(item)
  const yaw = item.yaw * DEG
  const own = measured[item.id]
  const kind = item.kind
  const place = useMemo(() => {
    if (kind.type === 'vessel') return null
    const fp = FOOTPRINTS[kind.type as 'lighthouse' | 'cottage']
    const height = (own?.height ?? (kind.type === 'lighthouse' ? LIGHTHOUSE_ESTIMATE : 5)) * item.size
    return placeScaled(
      { footprint: ringFootprint(fp[0], fp[1], 12), embed: 0, maxTilt: 0 },
      item.size,
      item.embed * height,
      x,
      z,
      yaw
    )
  }, [kind, own, item.size, item.embed, x, z, yaw])

  const click = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    onSelect(item.id)
  }
  const radius = (own ? Math.max(own.width, own.depth) / 2 : 1.5) * item.size + 0.15
  return (
    <>
      {kind.type === 'vessel' ? (
        <group
          ref={(o) => register(item.id, o)}
          position={[x, WATER_Y, z]}
          rotation={[0, yaw, 0]}
          scale={item.size}
          onClick={click}
        >
          <Boat kind={kind.vessel} look={VESSEL_LOOK(kind.vessel)} rig={MOORED} />
        </group>
      ) : (
        <group
          ref={(o) => register(item.id, o)}
          position={place!.position}
          quaternion={place!.quaternion}
          scale={item.size}
          onClick={click}
        >
          {kind.type === 'lighthouse' ? <Lighthouse position={[0, 0, 0]} /> : <Cottage position={[0, 0, 0]} />}
        </group>
      )}
      {(selected || settings.footprints) && <SelectionRing x={x} z={z} radius={radius} />}
    </>
  )
}

/** A model asset, at its share of the lighthouse's height */
function ModelPiece({ item, lighthouseHeight, settings, selected, register, onSelect }: ItemProps) {
  const recipe = useMemo(
    () =>
      item.kind.type === 'model'
        ? (ASSETS.find((a) => a.id === (item.kind as { recipe: string }).recipe) ?? null)
        : null,
    [item.kind]
  )
  const { build } = useAssetBuild(recipe, 1, item.level)
  const [x, z] = positionOf(item)
  const yaw = item.yaw * DEG
  const height = item.size * lighthouseHeight
  const scale = build ? height / build.size[1] : 1
  const place = useMemo(
    () => (build ? placeScaled(build.anchor, scale, item.embed * height, x, z, yaw) : null),
    [build, scale, item.embed, height, x, z, yaw]
  )
  if (!build || !place) return null
  const radius = (Math.max(build.size[0], build.size[2]) / 2) * scale + 0.1
  return (
    <>
      <group
        ref={(o) => register(item.id, o)}
        position={place.position}
        quaternion={place.quaternion}
        scale={scale}
        onClick={(e) => {
          e.stopPropagation()
          onSelect(item.id)
        }}
      >
        {build.parts.map((p, i) => (
          <group key={i}>
            <mesh
              geometry={p.geometry}
              material={p.material}
              castShadow={p.castShadow}
              receiveShadow={p.receiveShadow}
            />
            {settings.wireframe && <mesh geometry={p.geometry} material={wire} />}
          </group>
        ))}
      </group>
      {(selected || settings.footprints) && <SelectionRing x={x} z={z} radius={radius} />}
    </>
  )
}

const Item = memo(function Item(props: ItemProps) {
  if (!props.item.visible) return null
  return props.item.kind.type === 'model' ? <ModelPiece {...props} /> : <WorldPiece {...props} />
})

/** Measures the world's pieces once they're drawn (at size 1), and reports how tall every item stands on screen */
function Measure({
  items,
  objects,
  onMeasure,
  onScreen
}: {
  items: CompositionItem[]
  objects: MutableRefObject<Map<string, Object3D>>
  onMeasure: (m: Measured) => void
  onScreen: (s: ScreenSizes) => void
}) {
  const camera = useThree((s) => s.camera)
  const done = useRef<Set<string>>(new Set())
  const last = useRef(0)
  const corner = useMemo(() => new Vector3(), [])
  useFrame(() => {
    // the world's pieces, as built: measured once each (unscaled), after their first frame
    const found: Measured = {}
    for (const it of items) {
      if (it.kind.type === 'model' || done.current.has(it.id)) continue
      const o = objects.current.get(it.id)
      if (!o || o.children.length === 0) continue
      const box = solidBounds(o)
      if (box.isEmpty()) continue
      const s = it.size
      found[it.id] = {
        height: (box.max.y - box.min.y) / s,
        width: (box.max.x - box.min.x) / s,
        depth: (box.max.z - box.min.z) / s
      }
      done.current.add(it.id)
    }
    if (Object.keys(found).length) onMeasure(found)

    // on-screen heights, four times a second
    const now = performance.now()
    if (now - last.current < 250) return
    last.current = now
    const out: ScreenSizes = {}
    for (const it of items) {
      const o = objects.current.get(it.id)
      if (!o || !it.visible) continue
      const box = solidBounds(o)
      if (box.isEmpty()) continue
      let top = -Infinity
      let bottom = Infinity
      for (let i = 0; i < 8; i++) {
        corner
          .set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z)
          .project(camera)
        top = Math.max(top, corner.y)
        bottom = Math.min(bottom, corner.y)
      }
      out[it.id] = (top - bottom) / 2
    }
    onScreen(out)
  })
  return null
}

/** Where to look: a point on the ground, how tall the thing there stands and (if known) how far it spreads */
type Focus = { x: number; z: number; y: number; height: number; spread?: number }

/** Camera presets: azimuth and elevation (degrees), the point looked at, and how much of the world fits across */
function presetFor(view: CompositionView, lighthouse: Focus, focus: Focus | null) {
  // close on the selected item, where its base meets the ground (to judge its grounding and contact shadows)
  if (view === 'focus' && focus)
    return {
      azimuth: 40,
      elevation: 22,
      target: [focus.x, focus.y + focus.height * 0.38, focus.z],
      width: Math.max(focus.height * 2, (focus.spread ?? 0) * 1.15, 1.4),
      height: Math.max(focus.height * 1.35, 0.9)
    }
  if (view === 'portrait') {
    // the native app's landing: 45°, looking down 35°, 13.5 units across a portrait screen, the lantern near the top
    const az = 45 * DEG
    return {
      azimuth: az,
      elevation: 35,
      target: [
        lighthouse.x - Math.cos(az) * 1.1,
        lighthouse.y + lighthouse.height * 0.22,
        lighthouse.z + Math.sin(az) * 1.1
      ],
      width: 13.5
    }
  }
  // the whole tower above the water, the island and the sea in front of it
  if (view === 'water')
    return {
      azimuth: 28,
      elevation: 6,
      target: [0, lighthouse.height * 0.42, 0.6],
      width: 16,
      height: lighthouse.height * 1.15 + 1.5
    }
  // the whole tile and the whole tower (its height foreshortened by the 30° view), as the lighthouse diorama frames it
  return {
    azimuth: 45,
    elevation: 30,
    target: [0, lighthouse.height * 0.36, 0],
    width: 15.5,
    height: lighthouse.height * Math.cos(30 * DEG) + 10.5
  }
}

/** Puts the camera on a preset and points the orbit controls at its target */
function placeCamera(
  camera: OrthographicCamera,
  controls: { target: Vector3; update: () => void } | null,
  p: ReturnType<typeof presetFor>,
  size: { width: number; height: number }
) {
  const az = p.azimuth * DEG
  const el = p.elevation * DEG
  const [tx, ty, tz] = p.target
  const D = 80
  camera.position.set(
    tx + D * Math.cos(el) * Math.sin(az),
    ty + D * Math.sin(el),
    tz + D * Math.cos(el) * Math.cos(az)
  )
  camera.near = 0.1
  camera.far = 400
  camera.zoom = p.height ? Math.min(size.width / p.width, size.height / p.height) : size.width / p.width
  camera.lookAt(tx, ty, tz)
  camera.updateProjectionMatrix()
  if (controls) {
    controls.target.set(tx, ty, tz)
    controls.update()
  }
}

function CompositionCamera({
  view,
  nonce,
  lighthouse,
  focus,
  focusObject
}: {
  view: CompositionView
  nonce: number
  lighthouse: Focus
  focus: Focus | null
  /** The selected item as drawn, if it is yet: framed by its own bounds */
  focusObject: () => Object3D | undefined
}) {
  const camera = useThree((s) => s.camera) as OrthographicCamera
  const size = useThree((s) => s.size)
  const controls = useThree((s) => s.controls) as unknown as { target: Vector3; update: () => void } | null
  const fit = Math.min(size.width / 15.5, size.height / 15)
  // re-frame on a new preset (or the lighthouse's measured height), not on every change to the layout
  const key = `${view}:${nonce}:${lighthouse.height.toFixed(2)}:${size.width}x${size.height}:${view === 'focus' && focus ? focus.height.toFixed(2) : ''}`
  useLayoutEffect(() => {
    let around = focus
    const drawn = view === 'focus' ? focusObject() : undefined
    if (drawn) {
      const box = solidBounds(drawn)
      if (!box.isEmpty())
        around = {
          x: (box.min.x + box.max.x) / 2,
          z: (box.min.z + box.max.z) / 2,
          y: box.min.y,
          height: box.max.y - box.min.y,
          spread: Math.hypot(box.max.x - box.min.x, box.max.z - box.min.z)
        }
    }
    const p = presetFor(view, lighthouse, around)
    placeCamera(camera, controls, p, size)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, controls])
  return (
    <OrbitControls
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minZoom={fit * 0.4}
      maxZoom={fit * 40}
      minPolarAngle={0.1}
      maxPolarAngle={Math.PI / 2 - 0.02}
      zoomToCursor
    />
  )
}

export function CompositionScene({
  items,
  settings,
  view,
  viewNonce,
  selected,
  lighthouseHeight,
  measured,
  onSelect,
  onMeasure,
  onScreen,
  onStats
}: {
  items: CompositionItem[]
  settings: CompositionSettings
  view: CompositionView
  viewNonce: number
  selected: string | null
  lighthouseHeight: number
  measured: Measured
  onSelect: (id: string | null) => void
  onMeasure: (m: Measured) => void
  onScreen: (s: ScreenSizes) => void
  onStats: (s: FrameStats) => void
}) {
  const objects = useRef(new Map<string, Object3D>())
  const register = useMemo(
    () => (id: string, o: Object3D | null) => {
      if (o) objects.current.set(id, o)
      else objects.current.delete(id)
    },
    []
  )
  const rig = useMemo(() => ({ ...DEFAULT_SETTINGS, shadows: settings.shadows }), [settings.shadows])
  const shore = useMemo(() => compositionShore, [])
  const lh = items.find((i) => i.kind.type === 'lighthouse')
  const lighthouse = useMemo(() => {
    const [x, z] = lh ? positionOf(lh) : [0, 0]
    return { x, z, y: compositionTerrain.height(x, z), height: lighthouseHeight }
  }, [lh, lighthouseHeight])
  const chosen = items.find((i) => i.id === selected) ?? null
  const chosenHeight = chosen
    ? chosen.kind.type === 'model'
      ? chosen.size * lighthouseHeight
      : (measured[chosen.id]?.height ?? lighthouseHeight * 0.3) * chosen.size
    : 0
  const chosenAt = chosen ? `${chosen.u},${chosen.v}` : ''
  const focus = useMemo(() => {
    if (!chosenAt) return null
    const [u, v] = chosenAt.split(',').map(Number)
    const [x, z] = positionOf({ u, v })
    return { x, z, y: Math.max(compositionTerrain.height(x, z), 0), height: chosenHeight }
  }, [chosenAt, chosenHeight])

  return (
    <>
      <StudioLighting />
      <RigAdjust settings={rig} />
      {/* a click on the island or the sea (not on an item) lets go of the selection */}
      <group onClick={() => onSelect(null)}>
        <CoastalTile shore={shore} />
      </group>
      {/* the lighthouse as the native app draws it, with its glazed lantern and turning Fresnel lens */}
      <LanternStyle.Provider value="fresnel">
        {items.map((it) => (
          <Item
            key={it.id}
            item={it}
            lighthouseHeight={lighthouseHeight}
            measured={measured}
            settings={settings}
            selected={selected === it.id}
            register={register}
            onSelect={onSelect}
          />
        ))}
      </LanternStyle.Provider>
      <Measure items={items} objects={objects} onMeasure={onMeasure} onScreen={onScreen} />
      <CompositionCamera
        view={view}
        nonce={viewNonce}
        lighthouse={lighthouse}
        focus={focus}
        focusObject={() => (selected ? objects.current.get(selected) : undefined)}
      />
      <RenderStats onStats={onStats} />
      {settings.finish && (
        <EffectComposer multisampling={0} enableNormalPass={false}>
          <N8AO aoRadius={1.1} distanceFalloff={0.55} intensity={1.8} quality="high" color="#1d1712" halfRes={false} />
          <Bloom mipmapBlur luminanceThreshold={0.95} luminanceSmoothing={0.2} intensity={0.45} />
          <ToneMapping mode={ToneMappingMode.NEUTRAL} />
          <Vignette offset={0.28} darkness={0.35} />
          <SMAA />
        </EffectComposer>
      )}
    </>
  )
}
