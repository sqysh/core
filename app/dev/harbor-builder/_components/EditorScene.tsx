'use client'

import { TransformControls } from '@react-three/drei'
import { ThreeEvent, useFrame, useThree } from '@react-three/fiber'
import { MutableRefObject, useEffect, useMemo, useRef, useState } from 'react'
import { Box3, Box3Helper, Color, Group, MathUtils, Matrix4, type WebGLRenderer } from 'three'
import type { TransformControls as TransformControlsImpl } from 'three-stdlib'
import { FrameStats, RenderStats } from '@/app/dev/environment-kit/_components/RenderStats'
import { StudioLighting } from '@/app/dev/lighthouse/_components/StudioLighting'
import { modelById } from '../_lib/catalog'
import { baseScale, coastOf, Models, pivotOffset } from '../_lib/editor'
import { bakeSea } from '../_lib/ground'
import { LoadedModel } from '../_lib/models'
import { SceneCamera, SceneObject, Vec3 } from '../_lib/scene'
import { Batches, DrawStats } from './Batches'
import { BuilderCamera } from './BuilderCamera'
import { Finish } from './HarborScene'
import { Sea, SeaBake } from './Sea'

// The editor's scene: every visible object drawn from its model (in instanced draws: ./Batches), the world's studio lighting and the check-in harbor's
// animated sea (its shallows baked from the land as placed), a gizmo on the selected object, and the orthographic
// camera framed on the reference image. The shadow map is drawn only when something has moved: the scene is still
// apart from the sea, which only receives shadows, and redrawing millions of shadow-casting triangles every frame
// for nothing halves the frame rate.

const DEG = Math.PI / 180

export type EditorSettings = {
  wireframe: boolean
  lessGloss: boolean
  shadows: boolean
  finish: boolean
  ocean: boolean
  lod: boolean
  lodDebug: boolean
}

export type LODMap = Record<string, { medium?: LoadedModel; low?: LoadedModel }>

export type LODStats = { high: number; medium: number; low: number }

export type Gizmo = { mode: 'translate' | 'rotate' | 'scale'; space: 'world' | 'local'; snap: boolean }

export type Transformed = Pick<SceneObject, 'position' | 'rotation' | 'scale'>

/** What the editor's panels ask of the scene */
export type SceneApi = {
  /** The view as it is now, in the scene file's terms */
  currentView: () => SceneCamera
  /** The point on the water the camera orbits */
  viewTarget: () => Vec3
  /** True while the gizmo is hovered or dragged (a click there isn't a pick) */
  gizmoBusy: () => boolean
  /** Turns the camera about the vertical axis by this many degrees (eased); its elevation never changes */
  rotateBy: (degrees: number) => void
  /** Back to the default isometric direction and the approved framing (eased) */
  resetCamera: () => void
}

const SELECTED = new Color('#7fd3ff')
const round = (v: number, d = 3) => +v.toFixed(d)

/** An object in the scene graph: an empty group with its transform, for the gizmo to hold and its draw to read */
function Anchor({ obj, models, register }: { obj: SceneObject; models: Models; register: (id: string, g: Group | null) => void }) {
  const model = models[obj.model]
  const def = modelById(obj.model)
  if (!model || !def) return null
  const base = baseScale(model, def)
  return (
    <group
      ref={(g) => register(obj.id, g)}
      name={obj.id}
      position={obj.position}
      rotation={[obj.rotation[0] * DEG, obj.rotation[1] * DEG, obj.rotation[2] * DEG]}
      scale={[obj.scale[0] * base, obj.scale[1] * base, obj.scale[2] * base]}
      userData={{ base }}
    />
  )
}

// The scene is three.js objects mutated in place; these keep that out of the component body

function registerGizmoBusy(api: MutableRefObject<Partial<SceneApi>>, busy: () => boolean) {
  api.current.gizmoBusy = busy
}

function setShadowAutoUpdate(gl: WebGLRenderer, on: boolean) {
  gl.shadowMap.autoUpdate = on
}

/** The box round the selected object: shown only while there is one, and following it as it's dragged */
function updateSelectionBox(helper: Box3Helper, boxMatrix: Matrix4, group: Group | null, model: Models[string] | undefined) {
  helper.visible = !!group && !!model
  if (!group || !model) return
  group.updateMatrix()
  boxMatrix.copy(group.matrix).multiply(new Matrix4().makeTranslation(...pivotOffset(model)))
  helper.box.copy(model.box).applyMatrix4(boxMatrix)
}

export function EditorScene({
  objects,
  models,
  lodModels,
  settings,
  camera,
  startView,
  focus,
  selected,
  gizmo,
  api,
  onSelect,
  onTransform,
  onStats,
  onLodStats
}: {
  objects: SceneObject[]
  models: Models
  lodModels: LODMap
  settings: EditorSettings
  /** The approved view: its framing is what "Reset camera" returns to */
  camera: SceneCamera
  /** The view the editor opens on */
  startView: SceneCamera
  focus: { nonce: number; point: Vec3 } | null
  selected: string | null
  gizmo: Gizmo
  api: MutableRefObject<Partial<SceneApi>>
  onSelect: (id: string | null) => void
  onTransform: (id: string, t: Transformed) => void
  onStats: (s: FrameStats) => void
  onLodStats: (s: DrawStats) => void
}) {
  const gl = useThree((s) => s.gl)
  const groups = useRef(new Map<string, Group>())
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  const register = (id: string, g: Group | null) => {
    if (g) groups.current.set(id, g)
    else groups.current.delete(id)
  }
  useEffect(() => {
    const g = selected ? groups.current.get(selected) : undefined
    setSelectedGroup(g?.parent ? g : null)
  }, [selected, objects, models])

  // the gizmo: hovered or dragged, a click on it is not a pick
  const controls = useRef<TransformControlsImpl>(null)
  const dragging = useRef(false)
  const releasedAt = useRef(0)
  useEffect(() => {
    registerGizmoBusy(api, () => dragging.current || performance.now() - releasedAt.current < 250 || !!(controls.current as unknown as { axis: string | null } | null)?.axis)
  }, [api])
  const onPick = (e: ThreeEvent<MouseEvent>, id: string) => {
    e.stopPropagation()
    if (e.delta > 4 || api.current.gizmoBusy?.()) return
    onSelect(id)
  }

  // shadows drawn when something changes, not every frame
  const shadowDirty = useRef(true)
  useEffect(() => {
    setShadowAutoUpdate(gl, false)
    return () => setShadowAutoUpdate(gl, true)
  }, [gl])
  useEffect(() => {
    shadowDirty.current = true
  }, [objects, models, settings.shadows])
  useFrame(({ gl: renderer, invalidate }) => {
    if (shadowDirty.current || dragging.current) {
      renderer.shadowMap.needsUpdate = true
      shadowDirty.current = false
      invalidate() // in demand mode: request the follow-up frame that shows the updated shadow
    }
  })

  // a box round the selected object, following it while it's dragged
  const helper = useMemo(() => new Box3Helper(new Box3(), SELECTED), [])
  const selectedModel = models[objects.find((o) => o.id === selected)?.model ?? '']
  const boxMatrix = useMemo(() => new Matrix4(), [])
  useFrame(() => updateSelectionBox(helper, boxMatrix, selectedGroup, selectedModel))

  // the sea's shallows from the coast as placed, once it stops moving
  const coastKey = JSON.stringify(
    objects
      .filter((o) => o.visible && models[o.model] && ['land', 'islet'].includes(modelById(o.model)?.kind ?? ''))
      .map((o) => [o.model, o.position, o.rotation, o.scale])
  )
  const [bake, setBake] = useState<SeaBake | null>(null)
  useEffect(() => {
    if (!settings.ocean) return
    const t = window.setTimeout(() => setBake(bakeSea(coastOf(objects, models), 192, 3)), 500)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coastKey, settings.ocean])

  const commit = () => {
    const g = selectedGroup
    if (!g || !selected) return
    const base = (g.userData.base as number) || 1
    const r = g.rotation
    onTransform(selected, {
      position: [round(g.position.x), round(g.position.y), round(g.position.z)],
      rotation: [round(MathUtils.radToDeg(r.x), 2), round(MathUtils.radToDeg(r.y), 2), round(MathUtils.radToDeg(r.z), 2)],
      scale: [round(g.scale.x / base, 4), round(g.scale.y / base, 4), round(g.scale.z / base, 4)]
    })
  }

  const [cx, , cz] = camera.target
  // the shadow box takes in the approved view's whole frame (drawn once and kept, so its size costs nothing per frame)
  const shadowRange = Math.max(42, Math.round(camera.width * 0.62))
  return (
    <>
      <color attach="background" args={['#1f5f93']} />
      <StudioLighting focus={[cx, 0, cz]} shadowRange={shadowRange} shadowSoftness={4} shadowMapSize={shadowRange > 50 ? 2048 : 1024} backdrop={false} />
      {settings.ocean && <Sea bake={bake} />}
      {objects.map((o) => (o.visible ? <Anchor key={o.id} obj={o} models={models} register={register} /> : null))}
      <Batches
        objects={objects}
        models={models}
        lodModels={lodModels}
        settings={settings}
        groups={groups}
        uncull={() => shadowDirty.current || dragging.current}
        onPick={onPick}
        onStats={onLodStats}
      />
      <primitive object={helper} />
      {selectedGroup && (
        <TransformControls
          ref={controls}
          object={selectedGroup}
          mode={gizmo.mode}
          space={gizmo.space}
          translationSnap={gizmo.snap ? 0.25 : null}
          rotationSnap={gizmo.snap ? 15 * DEG : null}
          scaleSnap={gizmo.snap ? 0.05 : null}
          size={0.8}
          onMouseDown={() => {
            dragging.current = true
          }}
          onMouseUp={() => {
            dragging.current = false
            releasedAt.current = performance.now()
            commit()
          }}
        />
      )}
      <BuilderCamera home={camera} start={startView} focus={focus} api={api} />
      <RenderStats onStats={onStats} />
      {settings.finish && <Finish />}
    </>
  )
}
