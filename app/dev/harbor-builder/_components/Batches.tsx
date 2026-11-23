'use client'

import { ThreeEvent, useFrame } from '@react-three/fiber'
import { MutableRefObject, useEffect, useMemo, useRef } from 'react'
import { Frustum, Group, InstancedMesh, Intersection, Matrix4, Mesh, OrthographicCamera, Raycaster, Sphere } from 'three'
import { isCoast, modelById, ModelDef } from '../_lib/catalog'
import { Models, pickRaycast, pivotOffset } from '../_lib/editor'
import { LOD_DEBUG_MATS, LOD_LEVELS, LODLevel, selectLOD } from '../_lib/lod'
import { LoadedModel } from '../_lib/models'
import { SceneObject, Vec3 } from '../_lib/scene'
import type { EditorSettings, LODMap, LODStats } from './EditorScene'
import { wire } from './HarborScene'

// How the editor draws its objects: not a mesh each, but every placement of a model file in up to three instanced
// draws, one per level of detail, whatever number of them there are. Each frame every object is given its level (from
// how many pixels it covers) and written into that level's draw if it's in view; what's off screen isn't drawn at
// all. The objects themselves stay what they were, one empty group each carrying its transform: the gizmo moves the
// group, and its matrix is read here as it moves, so an object is still picked, dragged, undone and saved on its own.

export type DrawStats = LODStats & { drawn: number; objects: number }

type Batch = {
  key: string
  model: LoadedModel
  def: ModelDef
  lod?: { medium?: LoadedModel; low?: LoadedModel }
  pivot: Vec3
  /** The model's longest side as exported: times an object's scale, its size in the world */
  extent: number
  items: SceneObject[]
}

type Drawn = {
  meshes: Partial<Record<LODLevel, InstancedMesh>>
  overlays: Partial<Record<LODLevel, InstancedMesh>>
  /** Which object each instance of each level is, for picking */
  ids: Record<LODLevel, string[]>
}

const frustum = new Frustum()
const viewProjection = new Matrix4()
const viewMatrix = new Matrix4()
const matrix = new Matrix4()
const pivotMatrix = new Matrix4()
const sphere = new Sphere()
const one = new Mesh()
const found: Intersection[] = []

/** Picking an instanced draw: each instance in turn as a mesh of its own, through the model's BVH */
function batchRaycast(this: InstancedMesh, raycaster: Raycaster, intersects: Intersection[]) {
  one.geometry = this.geometry
  one.material = this.material
  for (let i = 0; i < this.count; i++) {
    this.getMatrixAt(i, one.matrixWorld)
    found.length = 0
    pickRaycast.call(one, raycaster, found)
    for (const hit of found) {
      hit.object = this
      hit.instanceId = i
      intersects.push(hit)
    }
  }
}

const noRaycast = () => null

/** The panel's counts, at most four times a second and always ending on the latest (`r` keeps the throttle's state) */
function throttledReport(r: { at: number; timer: number; latest: DrawStats | null }, stats: DrawStats, onStats: (s: DrawStats) => void) {
  r.latest = stats
  const wait = 250 - (performance.now() - r.at)
  if (wait <= 0) {
    r.at = performance.now()
    window.clearTimeout(r.timer)
    r.timer = 0
    onStats(stats)
  } else if (!r.timer)
    r.timer = window.setTimeout(() => {
      r.timer = 0
      r.at = performance.now()
      if (r.latest) onStats(r.latest)
    }, wait)
}

export function Batches({
  objects,
  models,
  lodModels,
  settings,
  groups,
  uncull,
  onPick,
  onStats
}: {
  objects: SceneObject[]
  models: Models
  lodModels: LODMap
  settings: EditorSettings
  /** Each object's group, by id (EditorScene's anchors) */
  groups: MutableRefObject<Map<string, Group>>
  /** True on a frame that draws the shadow map: everything is drawn then, in view or not, so all of it casts */
  uncull: () => boolean
  onPick: (e: ThreeEvent<MouseEvent>, id: string) => void
  onStats: (s: DrawStats) => void
}) {
  // the placements of each model file together (two catalog entries can share a file: they share its draws)
  const batches = useMemo(() => {
    const byModel = new Map<LoadedModel, Batch>()
    for (const o of objects) {
      const model = models[o.model]
      const def = modelById(o.model)
      if (!o.visible || !model || !def) continue
      let batch = byModel.get(model)
      if (!batch) {
        const size = model.box.max.clone().sub(model.box.min)
        batch = {
          key: model.geometry.uuid,
          model,
          def,
          lod: lodModels[o.model],
          pivot: pivotOffset(model),
          extent: Math.max(size.x, size.y, size.z),
          items: []
        }
        byModel.set(model, batch)
      }
      batch.items.push(o)
    }
    return [...byModel.values()]
  }, [objects, models, lodModels])

  const drawn = useRef(new Map<string, Drawn>())
  const levels = useRef<Record<string, LODLevel>>({})
  const reported = useRef('')
  // The counts are for the panel, which is React: they change as the camera moves (what's in view, which level),
  // and re-rendering the editor for each change would put React on the camera's frame. So they're reported at most
  // a few times a second, the last one always (trailing).
  const report = useRef({ at: 0, timer: 0, latest: null as DrawStats | null })
  useEffect(() => {
    const r = report.current
    return () => window.clearTimeout(r.timer)
  }, [])
  const send = (stats: DrawStats) => throttledReport(report.current, stats, onStats)
  const entry = (key: string) => {
    let d = drawn.current.get(key)
    if (!d) {
      d = { meshes: {}, overlays: {}, ids: { high: [], medium: [], low: [] } }
      drawn.current.set(key, d)
    }
    return d
  }
  const overlay = settings.wireframe || (settings.lod && settings.lodDebug)

  // after the orbit controls have moved the camera (-1), before the frame is drawn
  useFrame(({ camera }) => {
    const zoom = (camera as OrthographicCamera).zoom
    camera.updateMatrixWorld()
    frustum.setFromProjectionMatrix(
      viewProjection.multiplyMatrices(camera.projectionMatrix, viewMatrix.copy(camera.matrixWorld).invert())
    )
    const cull = !uncull()
    const stats: DrawStats = { high: 0, medium: 0, low: 0, drawn: 0, objects: 0 }
    for (const b of batches) {
      const d = drawn.current.get(b.key)
      if (!d?.meshes.high) continue
      const n = { high: 0, medium: 0, low: 0 }
      const bounds = b.model.geometry.boundingSphere!
      pivotMatrix.makeTranslation(...b.pivot)
      for (const o of b.items) {
        const g = groups.current.get(o.id)
        if (!g) continue
        g.updateMatrix()
        matrix.multiplyMatrices(g.matrix, pivotMatrix)
        let level: LODLevel = 'high'
        if (settings.lod) {
          level = selectLOD(levels.current[o.id], b.extent * Math.max(g.scale.x, g.scale.y, g.scale.z) * zoom)
          levels.current[o.id] = level
        }
        // the nearest level there's a mesh of (a model whose LODs haven't loaded yet, or has none)
        const at: LODLevel = d.meshes[level] ? level : level === 'low' && d.meshes.medium ? 'medium' : 'high'
        stats[at]++
        stats.objects++
        if (cull && !frustum.intersectsSphere(sphere.copy(bounds).applyMatrix4(matrix))) continue
        const i = n[at]++
        d.meshes[at]!.setMatrixAt(i, matrix)
        d.ids[at][i] = o.id
        stats.drawn++
      }
      for (const level of LOD_LEVELS) {
        const mesh = d.meshes[level]
        if (!mesh) continue
        mesh.count = n[level]
        mesh.instanceMatrix.needsUpdate = true
        const over = d.overlays[level]
        if (over) {
          over.instanceMatrix = mesh.instanceMatrix
          over.count = n[level]
        }
      }
    }
    const key = `${stats.high},${stats.medium},${stats.low},${stats.drawn}`
    if (key !== reported.current) {
      reported.current = key
      send(stats)
    }
  }, -0.5)

  return (
    <>
      {batches.map((b) => (
        // a new set of draws when the number of placements changes (an instanced mesh's capacity is fixed)
        <group key={`${b.key}:${b.items.length}`}>
          {LOD_LEVELS.map((level) => {
            const geometry = level === 'high' ? b.model.geometry : b.lod?.[level]?.geometry
            if (!geometry) return null
            return (
              <instancedMesh
                key={level}
                ref={(m) => {
                  if (m) entry(b.key).meshes[level] = m
                  else delete entry(b.key).meshes[level]
                }}
                args={[geometry, b.model.material, b.items.length]}
                count={0}
                frustumCulled={false}
                castShadow={settings.shadows && !isCoast(b.def)}
                receiveShadow
                raycast={batchRaycast}
                onClick={(e) => {
                  const id = entry(b.key).ids[level][e.instanceId ?? -1]
                  if (id) onPick(e, id)
                }}
              />
            )
          })}
          {overlay &&
            LOD_LEVELS.map((level) => {
              const geometry = level === 'high' ? b.model.geometry : b.lod?.[level]?.geometry
              if (!geometry) return null
              return (
                <instancedMesh
                  key={`over-${level}`}
                  ref={(m) => {
                    if (m) entry(b.key).overlays[level] = m
                    else delete entry(b.key).overlays[level]
                  }}
                  args={[geometry, settings.lod && settings.lodDebug ? LOD_DEBUG_MATS[level] : wire, b.items.length]}
                  count={0}
                  frustumCulled={false}
                  raycast={noRaycast}
                />
              )
            })}
        </group>
      ))}
    </>
  )
}
