'use client'

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { NeutralToneMapping, PCFShadowMap } from 'three'
import { FrameStats } from './_components/RenderStats'
import { AssetBrowser } from './_components/AssetBrowser'
import { DrawStats } from './_components/Batches'
import { EditorScene, EditorSettings, Gizmo, LODMap, SceneApi, Transformed } from './_components/EditorScene'
import {
  BenchmarkOverlay,
  chip,
  count,
  FrameBar,
  label,
  mb,
  NumberField,
  panel,
  Section,
  Slider
} from './_components/ui'
import { fileOf, lodFileOf, modelById, MODELS, Source } from './_lib/catalog'
import { baseScale, droppedPosition, Models, settledPosition } from './_lib/editor'
import { LoadedModel, loadModel, setLessGloss } from './_lib/models'
import { WORLD_BUILDER_CAMERA } from './_lib/builderCamera'
import { BENCHMARK_CONFIGS, FrameRecord, SampleReport, summarize } from './_lib/profiler'
import { freshId, GROUPS, parseScene, SceneFile, SceneObject, Vec3 } from './_lib/scene'

// The harbor editor: the CORE harbor assembled from the Meshy models, composed against the approved reference image.
// The scene lives in a file (assets/environment/harbor/harbor-scene.json, through ./scene/route.ts): every edit is
// saved to it as it's made, so a refresh, another browser or a commit all see the same harbor. Export and import
// move the same JSON by hand; "Revert" goes back to the baseline assembly. Nothing here changes a model on disk.
//
// Click a model to select it; W, E and R move, turn and scale it with the gizmo. ⌘Z and ⇧⌘Z undo and redo, ⌘D
// duplicates, ⌫ deletes, G drops it onto the ground below, F centres the view on it, Home returns to the approved
// camera, O shows the reference over the scene, H hides the panels.
//
// Address options (for checking a composition): ?panels=0, ?overlay=0.5, ?shadows=0, ?finish=0, ?source=original,
// ?lod=0 (full detail everywhere), ?loddebug=1, ?camera=azimuth,elevation,x,z,width (opens on that view instead of
// the approved one, for looking at a part of the scene: the elevation is accepted but ignored, it is always true
// isometric), and ?settle=1, which stands every model that stands on the
// ground on the land it shows against in the approved view (along the camera's line of sight), once everything has
// loaded, and saves.

const OVERLAY_KEY = 'core-harbor-editor-overlay'

type LoadState = { status: 'loading' | 'ready' | 'failed'; progress: number; error?: string }
type SaveState = { status: 'idle' | 'saving' | 'saved' | 'error'; message?: string }

const query = () => new URLSearchParams(window.location.search)
const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement

function storedOverlay() {
  const q = query().get('overlay')
  if (q !== null) return { on: Number(q) > 0, opacity: Number(q) || 0.5 }
  try {
    const s = JSON.parse(window.localStorage.getItem(OVERLAY_KEY) ?? 'null')
    if (s && typeof s.on === 'boolean' && typeof s.opacity === 'number') return s as { on: boolean; opacity: number }
  } catch {
    // blocked storage: the overlay just starts off
  }
  return { on: false, opacity: 0.5 }
}

function BenchmarkCollector({ onFrame }: { onFrame: (r: FrameRecord) => void }) {
  const gl = useThree((s) => s.gl)
  const prev = useRef(0)
  useEffect(() => {
    prev.current = performance.now()
  }, [])
  useFrame(({ invalidate }) => {
    const now = performance.now()
    onFrame({ t: now, dt: now - prev.current, tris: gl.info.render.triangles, calls: gl.info.render.calls })
    prev.current = now
    invalidate()
  }, -101)
  return null
}

export default function HarborEditor() {
  const [scene, setScene] = useState<SceneFile | null>(null)
  const sceneRef = useRef<SceneFile | null>(null)
  const [sceneSource, setSceneSource] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [source, setSource] = useState<Source>(() => {
    const q = query().get('source')
    if (q === 'draft') return 'draft'
    if (q === 'original') return 'original'
    return 'cleaned'
  })
  const [settings, setSettings] = useState<EditorSettings>(() => ({
    wireframe: false,
    lessGloss: true,
    shadows: query().get('shadows') !== '0',
    finish: query().get('finish') !== '0',
    ocean: true,
    lod: query().get('lod') !== '0',
    lodDebug: query().get('loddebug') === '1'
  }))
  const [selected, setSelected] = useState<string | null>(null)
  const [gizmo, setGizmo] = useState<Gizmo>({ mode: 'translate', space: 'world', snap: false })
  const [overlay, setOverlay] = useState(storedOverlay)
  const [panels, setPanels] = useState(() => query().get('panels') !== '0')
  const [focus, setFocus] = useState<{ nonce: number; point: Vec3 } | null>(null)
  const [frame, setFrame] = useState<FrameStats | null>(null)
  const [save, setSave] = useState<SaveState>({ status: 'idle' })
  const [loaded, setLoaded] = useState<Record<string, LoadedModel | undefined>>({})
  const [loads, setLoads] = useState<Record<string, LoadState>>({})
  const [lodLoaded, setLodLoaded] = useState<Record<string, LoadedModel | undefined>>({})
  const lodRequested = useRef(new Set<string>())
  const [lodStats, setLodStats] = useState<DrawStats>({ high: 0, medium: 0, low: 0, drawn: 0, objects: 0 })
  const [filter, setFilter] = useState('')
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [library, setLibrary] = useState(false)
  // scene management
  const [sceneName] = useState(() => query().get('scene') ?? 'harbor')
  const [scenes, setScenes] = useState<string[]>(['harbor'])
  const [scenePicker, setScenePicker] = useState(false)
  const [newSceneName, setNewSceneName] = useState('')
  const SCENE_URL = `/dev/harbor-builder/scene?name=${sceneName}`
  const api = useRef<Partial<SceneApi>>({})
  const [benchmarking, setBenchmarking] = useState(false)
  const [benchResults, setBenchResults] = useState<SampleReport[] | null>(null)
  const [benchPhase, setBenchPhase] = useState('')
  const benchRecording = useRef(false)
  const benchFrames = useRef<FrameRecord[]>([])
  const onBenchmarkFrame = useCallback((r: FrameRecord) => {
    if (benchRecording.current) benchFrames.current.push(r)
  }, [])
  const past = useRef<SceneFile[]>([])
  const future = useRef<SceneFile[]>([])
  const [historyDepth, setHistoryDepth] = useState({ undo: 0, redo: 0 })
  const syncHistoryDepth = () => setHistoryDepth({ undo: past.current.length, redo: future.current.length })
  const version = useRef(0)
  const savedVersion = useRef(0)
  const importer = useRef<HTMLInputElement>(null)

  useEffect(() => {
    try {
      window.localStorage.setItem(OVERLAY_KEY, JSON.stringify(overlay))
    } catch {
      // blocked storage: the overlay setting just isn't remembered
    }
  }, [overlay])

  // scene list (for the picker)
  useEffect(() => {
    fetch('/dev/harbor-builder/api/scenes')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.scenes?.length) setScenes(d.scenes)
      })
      .catch(() => {})
  }, [])

  // the scene file
  useEffect(() => {
    fetch(SCENE_URL, { cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) throw new Error(`${SCENE_URL}: ${r.status} ${(await r.text()).slice(0, 120)}`)
        setSceneSource(r.headers.get('x-scene-source'))
        const s = parseScene(await r.json())
        sceneRef.current = s
        setScene(s)
      })
      .catch((e: Error) => setLoadError(e.message))
  }, [])

  /** Every change to the scene: kept for undo (unless `record` is false) and saved to the file */
  const commit = useCallback((change: (s: SceneFile) => SceneFile, record = true) => {
    const prev = sceneRef.current
    if (!prev) return
    const next = change(prev)
    if (next === prev) return
    if (record) {
      past.current.push(prev)
      if (past.current.length > 200) past.current.shift()
      future.current = []
    }
    sceneRef.current = next
    version.current++
    setScene(next)
    setHistoryDepth({ undo: past.current.length, redo: future.current.length })
  }, [])
  const undo = () => {
    const prev = past.current.pop()
    if (!prev || !sceneRef.current) return
    future.current.push(sceneRef.current)
    sceneRef.current = prev
    version.current++
    setScene(prev)
    syncHistoryDepth()
  }
  const redo = () => {
    const next = future.current.pop()
    if (!next || !sceneRef.current) return
    past.current.push(sceneRef.current)
    sceneRef.current = next
    version.current++
    setScene(next)
    syncHistoryDepth()
  }
  const updateObject = (id: string, patch: Partial<SceneObject>) =>
    commit((s) => ({ ...s, objects: s.objects.map((o) => (o.id === id ? { ...o, ...patch } : o)) }))

  // saved as it's edited (a moment after the last change), and on leaving with a change unsaved
  const put = useCallback(async (s: SceneFile, v: number) => {
    try {
      const r = await fetch(SCENE_URL, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(s)
      })
      if (!r.ok) throw new Error(((await r.json().catch(() => ({}))) as { error?: string }).error ?? `${r.status}`)
      savedVersion.current = Math.max(savedVersion.current, v)
      if (savedVersion.current === version.current) setSave({ status: 'saved' })
    } catch (e) {
      setSave({ status: 'error', message: (e as Error).message })
    }
  }, [])
  useEffect(() => {
    if (!scene || version.current === savedVersion.current) return
    setSave({ status: 'saving' })
    const v = version.current
    const t = window.setTimeout(() => put(scene, v), 400)
    return () => window.clearTimeout(t)
  }, [scene, put])
  useEffect(() => {
    const flush = () => {
      if (sceneRef.current && version.current !== savedVersion.current)
        fetch(SCENE_URL, {
          method: 'PUT',
          keepalive: true,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(sceneRef.current)
        })
    }
    window.addEventListener('pagehide', flush)
    return () => window.removeEventListener('pagehide', flush)
  }, [])

  // models: each file loaded once, when something visible first needs it
  const models: Models = useMemo(
    () => Object.fromEntries(MODELS.map((d) => [d.id, loaded[fileOf(d, source)]])),
    [loaded, source]
  )
  const requested = useRef(new Map<string, Promise<LoadedModel>>())
  const ensure = useCallback(
    (id: string): Promise<LoadedModel> => {
      const def = modelById(id)
      if (!def) return Promise.reject(new Error(`unknown model "${id}"`))
      const url = fileOf(def, source)
      const hit = requested.current.get(url)
      if (hit) return hit
      setLoads((l) => ({ ...l, [url]: { status: 'loading', progress: 0 } }))
      const p = loadModel(url, true, (got, total) =>
        setLoads((l) =>
          l[url]?.status === 'loading' ? { ...l, [url]: { status: 'loading', progress: total ? got / total : 0 } } : l
        )
      ).then(
        (model) => {
          setLoaded((ms) => ({ ...ms, [url]: model }))
          setLoads((l) => ({ ...l, [url]: { status: 'ready', progress: 1 } }))
          return model
        },
        (e: Error) => {
          setLoads((l) => ({ ...l, [url]: { status: 'failed', progress: 0, error: e.message } }))
          requested.current.delete(url)
          throw e
        }
      )
      requested.current.set(url, p)
      return p
    },
    [source]
  )
  const needed = useMemo(
    () => (scene ? [...new Set(scene.objects.filter((o) => o.visible).map((o) => o.model))].sort() : []),
    [scene]
  )
  const neededKey = needed.join(',')
  useEffect(() => {
    for (const id of neededKey.split(',').filter(Boolean)) ensure(id).catch(() => {})
  }, [neededKey, ensure])
  useEffect(() => setLessGloss(settings.lessGloss), [settings.lessGloss, loaded])
  const ready = needed.filter((id) => models[id]).length
  const allReady = !!scene && ready === needed.length

  // LOD variants: medium and low for each visible model's GLB when LOD is on, asked for at once (they load ahead of
  // the full files: see loadModel)
  useEffect(() => {
    if (!settings.lod) return
    const seen = new Set<string>()
    for (const id of needed) {
      const def = modelById(id)
      if (!def) continue
      const glb = def.file
      if (seen.has(glb)) continue
      seen.add(glb)
      for (const level of ['medium', 'low'] as const) {
        const url = lodFileOf(def, level)
        if (lodRequested.current.has(url)) continue
        lodRequested.current.add(url)
        loadModel(url, true).then(
          (m) => setLodLoaded((prev) => ({ ...prev, [url]: m })),
          () => {}
        )
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.lod, neededKey])

  const lodModels: LODMap = useMemo(() => {
    if (!settings.lod) return {}
    const result: LODMap = {}
    const seen = new Set<string>()
    for (const def of MODELS) {
      if (seen.has(def.file)) continue
      seen.add(def.file)
      const medium = lodLoaded[lodFileOf(def, 'medium')]
      const low = lodLoaded[lodFileOf(def, 'low')]
      if (medium || low) result[def.id] = { medium, low }
    }
    // Multiple catalog IDs can share the same GLB — copy the LOD entry for each alias
    for (const def of MODELS) {
      if (!result[def.id]) {
        const canonical = MODELS.find((d) => d.file === def.file && result[d.id])
        if (canonical) result[def.id] = result[canonical.id]
      }
    }
    return result
  }, [lodLoaded, settings.lod])

  // ?settle=1: everything that stands on the ground set on the ground it shows against in the approved view, once,
  // when all of it has loaded (for composing against the reference)
  const settled = useRef(query().get('settle') !== '1')
  useEffect(() => {
    if (settled.current || !allReady) return
    settled.current = true
    commit((s) => {
      let objects = s.objects
      for (const o of s.objects) {
        const def = modelById(o.model)
        if (!o.visible || !def || def.free) continue
        const p = settledPosition(o, objects, models, s.camera) ?? droppedPosition(o, objects, models)
        if (p) objects = objects.map((x) => (x.id === o.id ? { ...x, position: p } : x))
      }
      return { ...s, objects }
    }, false)
  }, [allReady, models, commit])

  // profiler benchmark: cycles through 5 feature configurations, measures each for 4 seconds
  const runBenchmark = useCallback(async () => {
    if (!allReady || benchmarking) return
    const original = { ...settings }
    setBenchmarking(true)
    setBenchResults(null)
    setSelected(null)
    const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
    const results: SampleReport[] = []
    for (const config of BENCHMARK_CONFIGS) {
      setBenchPhase(config.label)
      setSettings(() => ({ ...original, shadows: config.shadows, ocean: config.ocean, finish: config.finish }))
      await delay(1500)
      benchFrames.current = []
      benchRecording.current = true
      await delay(4000)
      benchRecording.current = false
      results.push(summarize(config.label, benchFrames.current))
    }
    setSettings(original)
    setBenchmarking(false)
    setBenchPhase('')
    setBenchResults(results)
  }, [allReady, benchmarking, settings, source, sceneName])

  const objects = useMemo(() => scene?.objects ?? [], [scene])
  const current = objects.find((o) => o.id === selected) ?? null
  const currentDef = current ? modelById(current.model) : undefined
  const currentModel = current ? models[current.model] : undefined

  // editing
  const remove = (id: string) => {
    commit((s) => ({ ...s, objects: s.objects.filter((o) => o.id !== id) }))
    setSelected(null)
  }
  const duplicate = (id: string) => {
    const o = sceneRef.current?.objects.find((x) => x.id === id)
    if (!o) return
    const copy: SceneObject = {
      ...o,
      id: freshId(
        o.id,
        sceneRef.current!.objects.map((x) => x.id)
      ),
      // a step to the right on screen, so the copy shows
      position: [+(o.position[0] + 1.06).toFixed(3), o.position[1], +(o.position[2] - 1.06).toFixed(3)]
    }
    commit((s) => {
      const i = s.objects.findIndex((x) => x.id === id)
      return { ...s, objects: [...s.objects.slice(0, i + 1), copy, ...s.objects.slice(i + 1)] }
    })
    setSelected(copy.id)
  }
  const drop = (id: string) => {
    const o = sceneRef.current?.objects.find((x) => x.id === id)
    if (!o) return
    const p = droppedPosition(o, sceneRef.current!.objects, models)
    if (p) updateObject(id, { position: p })
  }
  const dropGroup = (group: string) =>
    commit((s) => {
      let objs = s.objects
      for (const o of s.objects) {
        const def = modelById(o.model)
        if (o.group !== group || !o.visible || !def || def.free) continue
        const p = droppedPosition(o, objs, models)
        if (p) objs = objs.map((x) => (x.id === o.id ? { ...x, position: p } : x))
      }
      return { ...s, objects: objs }
    })
  const add = (modelId: string) => {
    const def = modelById(modelId)
    const target = api.current.viewTarget?.() ?? [0, 0, 0]
    if (!def) return
    ensure(modelId).then((model) => {
      const s = sceneRef.current
      if (!s) return
      const obj: SceneObject = {
        id: freshId(
          modelId,
          s.objects.map((o) => o.id)
        ),
        name: def.name,
        model: modelId,
        group: current?.group ?? 'Other',
        position: [target[0], 0, target[2]],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        visible: true
      }
      const p = def.free ? null : droppedPosition(obj, s.objects, { ...models, [modelId]: model })
      if (p) obj.position = p
      commit((sc) => ({ ...sc, objects: [...sc.objects, obj] }))
      setSelected(obj.id)
    })
  }
  const focusOn = (o: SceneObject) =>
    setFocus((f) => ({ nonce: (f?.nonce ?? 0) + 1, point: [o.position[0], o.position[1], o.position[2]] }))
  const onTransform = useCallback(
    (id: string, t: Transformed) =>
      commit((s) => ({ ...s, objects: s.objects.map((o) => (o.id === id ? { ...o, ...t } : o)) })),
    [commit]
  )

  // keys
  const keys = useRef<(e: KeyboardEvent) => void>(() => {})
  const onKey = (e: KeyboardEvent) => {
    if (isTyping(e.target)) return
    const k = e.key.toLowerCase()
    const mod = e.metaKey || e.ctrlKey
    if (mod && k === 'z') {
      e.preventDefault()
      if (e.shiftKey) redo()
      else undo()
    } else if (mod && k === 'y') {
      e.preventDefault()
      redo()
    } else if (mod && k === 'd') {
      e.preventDefault()
      if (selected) duplicate(selected)
    } else if (mod) return
    else if (k === 'w') setGizmo((g) => ({ ...g, mode: 'translate' }))
    else if (k === 'e') setGizmo((g) => ({ ...g, mode: 'rotate' }))
    else if (k === 'r') setGizmo((g) => ({ ...g, mode: 'scale' }))
    else if (k === 'q') setGizmo((g) => ({ ...g, space: g.space === 'world' ? 'local' : 'world' }))
    else if (k === 'h') setPanels((v) => !v)
    else if (k === 'o') setOverlay((o: { on: boolean; opacity: number }) => ({ ...o, on: !o.on }))
    else if (k === 'home') api.current.resetCamera?.()
    else if (k === 'arrowleft') {
      e.preventDefault()
      api.current.rotateBy?.(-WORLD_BUILDER_CAMERA.rotate.keyStep)
    } else if (k === 'arrowright') {
      e.preventDefault()
      api.current.rotateBy?.(WORLD_BUILDER_CAMERA.rotate.keyStep)
    } else if (k === 'escape') setSelected(null)
    else if (k === 'f' && current) focusOn(current)
    else if (k === 'g' && selected) drop(selected)
    else if ((k === 'delete' || k === 'backspace') && selected) {
      e.preventDefault()
      remove(selected)
    }
  }
  useEffect(() => {
    keys.current = onKey
  })
  useEffect(() => {
    const on = (e: KeyboardEvent) => keys.current(e)
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [])

  // the file
  const exportJson = () => {
    if (!scene) return
    const url = URL.createObjectURL(new Blob([`${JSON.stringify(scene, null, 2)}\n`], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'harbor-scene.json'
    a.click()
    URL.revokeObjectURL(url)
  }
  const importJson = async (file: File) => {
    try {
      const s = parseScene(JSON.parse(await file.text()))
      commit(() => s)
      setSelected(null)
    } catch (e) {
      window.alert(`That file isn't a harbor scene: ${(e as Error).message}`)
    }
  }
  const createScene = async () => {
    const n = newSceneName.trim()
    if (!n) return
    try {
      const r = await fetch('/dev/harbor-builder/api/scenes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: n })
      })
      const data = await r.json()
      if (!r.ok) {
        window.alert(data.error ?? 'Could not create scene')
        return
      }
      setScenes((prev) => [...prev, n])
      setNewSceneName('')
      window.location.search = `?scene=${n}`
    } catch (e) {
      window.alert((e as Error).message)
    }
  }

  const switchScene = (name: string) => {
    const params = new URLSearchParams(window.location.search)
    params.set('scene', name)
    const url = new URL(window.location.href)
    url.search = params.toString()
    window.location.assign(url.href)
  }

  const revert = async () => {
    if (!window.confirm('Go back to the baseline assembly? (Undo brings this version back.)')) return
    try {
      const r = await fetch(`${SCENE_URL}&from=baseline`, { cache: 'no-store' })
      if (!r.ok) throw new Error(`${r.status}`)
      const s = parseScene(await r.json())
      commit(() => s)
      setSelected(null)
    } catch (e) {
      window.alert(`No baseline to go back to (${(e as Error).message})`)
    }
  }

  // what's drawn costs
  const cost = useMemo(() => {
    const byModel = new Map<string, number>()
    for (const o of objects) if (o.visible && models[o.model]) byModel.set(o.model, (byModel.get(o.model) ?? 0) + 1)
    let triangles = 0
    let files = 0
    let textures = 0
    const rows: { id: string; name: string; n: number; triangles: number; bytes: number }[] = []
    for (const [id, n] of byModel) {
      const m = models[id]!
      triangles += m.triangles * n
      files += m.bytes
      textures += m.textureGpuBytes
      rows.push({ id, name: modelById(id)?.name ?? id, n, triangles: m.triangles * n, bytes: m.bytes })
    }
    rows.sort((a, b) => b.triangles - a.triangles)
    return { triangles, files, textures, rows, instances: [...byModel.values()].reduce((a, b) => a + b, 0) }
  }, [objects, models])

  const groups = useMemo(() => {
    const names = [
      ...GROUPS,
      ...new Set(objects.map((o) => o.group).filter((g) => !(GROUPS as readonly string[]).includes(g)))
    ]
    const f = filter.trim().toLowerCase()
    return names
      .map((g) => ({
        name: g,
        items: objects.filter(
          (o) => o.group === g && (!f || o.name.toLowerCase().includes(f) || o.id.includes(f) || o.model.includes(f))
        )
      }))
      .filter((g) => g.items.length || !f)
  }, [objects, filter])

  const pointerDown = useRef({ x: 0, y: 0 })
  const progress = needed.length
    ? needed.reduce((n, id) => {
        const def = modelById(id)
        return n + (def ? (loads[fileOf(def, source)]?.progress ?? 0) : 0)
      }, 0) / needed.length
    : 1

  // ?camera=…: the view the editor opens on (the approved view stays as it is in the scene)
  // The elevation is the World Builder camera's, never the scene file's or the address's.
  const hasScene = !!scene
  const openingView = useMemo(() => {
    if (!scene) return null
    const iso = { ...scene.camera, elevation: WORLD_BUILDER_CAMERA.elevation }
    const v = (query().get('camera') ?? '').split(',').map(Number)
    if (v.length !== 5 || v.some((n) => !Number.isFinite(n)))
      return { ...iso, azimuth: WORLD_BUILDER_CAMERA.defaultAzimuth }
    return { ...iso, azimuth: v[0], target: [v[2], 0, v[3]] as Vec3, width: v[4] }
    // opening once is all it's for: later changes to the approved view don't move the camera
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasScene])

  if (loadError)
    return (
      <div className="fixed inset-0 z-[60] grid place-items-center bg-[#0d1727] p-8 text-sm text-white/80">
        <p>The harbor scene couldn&apos;t be read: {loadError}</p>
      </div>
    )

  const frameAspect = scene?.camera.aspect ?? 16 / 9

  return (
    <div
      className="fixed inset-0 z-[60] bg-[#1f5f93]"
      onPointerDown={(e) => {
        pointerDown.current = { x: e.clientX, y: e.clientY }
      }}
    >
      {scene && (
        <Canvas
          style={{ position: 'absolute', inset: 0 }}
          orthographic
          shadows={{ type: PCFShadowMap }}
          dpr={1}
          frameloop="demand"
          camera={{
            position: [100, 100, 100],
            zoom: 20,
            near: WORLD_BUILDER_CAMERA.near,
            far: WORLD_BUILDER_CAMERA.far
          }}
          gl={{ antialias: false }}
          onCreated={({ gl }) => {
            gl.toneMapping = NeutralToneMapping
          }}
          onPointerMissed={(e) => {
            const moved = Math.hypot(e.clientX - pointerDown.current.x, e.clientY - pointerDown.current.y)
            if (e.type === 'click' && moved < 5 && !api.current.gizmoBusy?.()) setSelected(null)
          }}
        >
          <EditorScene
            objects={objects}
            models={models}
            lodModels={lodModels}
            settings={settings}
            camera={scene.camera}
            startView={openingView ?? scene.camera}
            focus={focus}
            selected={panels ? selected : null}
            gizmo={gizmo}
            api={api}
            onSelect={setSelected}
            onTransform={onTransform}
            onStats={setFrame}
            onLodStats={setLodStats}
          />
          {benchmarking && <BenchmarkCollector onFrame={onBenchmarkFrame} />}
        </Canvas>
      )}

      {scene && overlay.on && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div
            className="relative outline outline-1 outline-white/40"
            style={{ aspectRatio: `${frameAspect}`, width: `min(100vw, ${100 * frameAspect}dvh)` }}
          >
            {scene.reference && (
              <img
                src={scene.reference}
                alt=""
                className="absolute inset-0 h-full w-full"
                style={{ opacity: overlay.opacity }}
              />
            )}
          </div>
        </div>
      )}

      {panels && scene && (
        <>
          {/* the gizmo's tools */}
          <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center">
            <div className={`${panel} flex items-center gap-1.5 px-3 py-2`}>
              {(
                [
                  ['translate', 'Move', 'W'],
                  ['rotate', 'Rotate', 'E'],
                  ['scale', 'Scale', 'R']
                ] as const
              ).map(([mode, name, key]) => (
                <button
                  key={mode}
                  className={chip(gizmo.mode === mode)}
                  onClick={() => setGizmo((g) => ({ ...g, mode }))}
                >
                  {name} <span className="text-white/40">{key}</span>
                </button>
              ))}
              <span className="mx-1 h-4 w-px bg-white/15" />
              <button
                className={chip(false)}
                onClick={() => setGizmo((g) => ({ ...g, space: g.space === 'world' ? 'local' : 'world' }))}
              >
                {gizmo.space === 'world' ? 'World axes' : 'Local axes'} <span className="text-white/40">Q</span>
              </button>
              <button className={chip(gizmo.snap)} onClick={() => setGizmo((g) => ({ ...g, snap: !g.snap }))}>
                Snap
              </button>
              <span className="mx-1 h-4 w-px bg-white/15" />
              <button className={chip(false)} disabled={!historyDepth.undo} onClick={undo} title="Undo (⌘Z)">
                ↶
              </button>
              <button className={chip(false)} disabled={!historyDepth.redo} onClick={redo} title="Redo (⇧⌘Z)">
                ↷
              </button>
            </div>
          </div>

          <div className="pointer-events-none absolute inset-0 flex items-start justify-between gap-4 p-3 pt-3">
            {/* scene and objects */}
            <div className={`${panel} w-[19rem]`}>
              {/* Studio header + scene switcher */}
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-sora text-lg font-black tracking-tight">
                    World builder<span className="text-sky-300">.</span>
                  </p>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <span className="text-[10px] text-white/40">Scene</span>
                    <button
                      className="text-[11px] font-semibold text-sky-300 hover:text-sky-200"
                      onClick={() => setScenePicker((v) => !v)}
                      title="Switch scene"
                    >
                      {sceneName} ⌄
                    </button>
                  </div>
                </div>
                <p className="mt-1 shrink-0 text-[11px] text-white/55">
                  {save.status === 'saving'
                    ? 'Saving…'
                    : save.status === 'saved'
                      ? 'Saved'
                      : save.status === 'error'
                        ? ''
                        : sceneSource === 'baseline'
                          ? 'Baseline'
                          : ''}
                  {save.status === 'error' && <span className="text-amber-300">! {save.message}</span>}
                </p>
              </div>

              {/* Scene picker dropdown */}
              {scenePicker && (
                <div className="mt-2 rounded-xl border border-white/10 bg-black/30 p-2">
                  {scenes.map((name) => (
                    <button
                      key={name}
                      onClick={() => switchScene(name)}
                      className={`w-full rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-white/10 ${name === sceneName ? 'font-semibold text-sky-300' : 'text-white/80'}`}
                    >
                      {name === sceneName ? '→ ' : ''}
                      {name}
                    </button>
                  ))}
                  <div className="mt-2 flex gap-1.5 border-t border-white/10 pt-2">
                    <input
                      value={newSceneName}
                      onChange={(e) => setNewSceneName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                      onKeyDown={(e) => e.key === 'Enter' && createScene()}
                      placeholder="new-scene-name"
                      className="min-w-0 flex-1 rounded-md border border-white/10 bg-black/25 px-2 py-1 text-[11px] text-white outline-none placeholder:text-white/30 focus:border-sky-300/60"
                    />
                    <button className={chip(false)} onClick={createScene} disabled={!newSceneName.trim()}>
                      Create
                    </button>
                  </div>
                </div>
              )}

              {/* File actions */}
              <div className="mt-2 flex flex-wrap gap-1.5">
                <button className={chip(false)} onClick={exportJson}>
                  Export JSON
                </button>
                <button className={chip(false)} onClick={() => importer.current?.click()}>
                  Import
                </button>
                <button className={chip(false)} onClick={revert}>
                  Revert to baseline
                </button>
                <input
                  ref={importer}
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) importJson(f)
                    e.target.value = ''
                  }}
                />
              </div>
              {!allReady && (
                <p className="mt-2 text-[11px] text-white/55">
                  Loading models {ready}/{needed.length} ({Math.round(progress * 100)}%)
                </p>
              )}

              {/* Asset browser or objects list */}
              {library ? (
                <div className="mt-4 flex-1">
                  <AssetBrowser
                    models={models}
                    onAdd={(id) => {
                      add(id)
                      setLibrary(false)
                    }}
                    onClose={() => setLibrary(false)}
                  />
                </div>
              ) : (
                <Section
                  title={`Objects (${objects.length})`}
                  right={
                    <button className={chip(library)} onClick={() => setLibrary((v) => !v)}>
                      + Add model
                    </button>
                  }
                >
                  <input
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    placeholder="Filter"
                    className="mb-2 w-full rounded-md border border-white/10 bg-black/25 px-2 py-1 text-[11px] text-white outline-none placeholder:text-white/30 focus:border-sky-300/60"
                  />
                  {groups.map((g) => {
                    const shown = g.items.some((o) => o.visible)
                    const open = !collapsed[g.name] || !!filter
                    return (
                      <div key={g.name} className="mb-1">
                        <div className="flex items-center gap-1.5 rounded-md px-1 py-0.5 hover:bg-white/5">
                          <button
                            className="w-4 text-[10px] text-white/50"
                            onClick={() => setCollapsed((c) => ({ ...c, [g.name]: !c[g.name] }))}
                          >
                            {open ? '▾' : '▸'}
                          </button>
                          <button
                            title={shown ? 'Hide all' : 'Show all'}
                            className="text-[11px] text-white/60 hover:text-white"
                            onClick={() =>
                              commit((s) => ({
                                ...s,
                                objects: s.objects.map((o) => (o.group === g.name ? { ...o, visible: !shown } : o))
                              }))
                            }
                          >
                            {shown ? '●' : '○'}
                          </button>
                          <span className="flex-1 text-[11px] font-semibold text-white/85">{g.name}</span>
                          <button
                            title="Drop everything in this group that stands on the ground onto it"
                            className="text-[10px] text-white/40 hover:text-white"
                            onClick={() => dropGroup(g.name)}
                          >
                            ⤓
                          </button>
                          <span className="font-mono text-[10px] text-white/35">{g.items.length}</span>
                        </div>
                        {open && (
                          <ul className="ml-5 space-y-px text-[11px]">
                            {g.items.map((o) => {
                              const def = modelById(o.model)
                              const st = def ? loads[fileOf(def, source)] : undefined
                              return (
                                <li
                                  key={o.id}
                                  onClick={() => setSelected(o.id)}
                                  onDoubleClick={() => focusOn(o)}
                                  className={`flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-0.5 ${selected === o.id ? 'bg-sky-400/25' : 'hover:bg-white/5'} ${o.visible ? '' : 'opacity-40'}`}
                                >
                                  <button
                                    title={o.visible ? 'Hide' : 'Show'}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      updateObject(o.id, { visible: !o.visible })
                                    }}
                                    className="text-white/60 hover:text-white"
                                  >
                                    {o.visible ? '●' : '○'}
                                  </button>
                                  <span className="flex-1 truncate text-white/90">{o.name}</span>
                                  <span className="font-mono text-[10px] text-white/35">
                                    {!def
                                      ? 'unknown model'
                                      : st?.status === 'failed'
                                        ? 'failed'
                                        : st?.status === 'loading'
                                          ? `${Math.round(st.progress * 100)}%`
                                          : ''}
                                  </span>
                                </li>
                              )
                            })}
                          </ul>
                        )}
                      </div>
                    )
                  })}
                </Section>
              )}
            </div>

            {/* the selection, the view, the cost */}
            <div className={`${panel} w-[17.5rem]`}>
              {current ? (
                <Section
                  title="Selected"
                  right={
                    <button className="text-[11px] text-white/45 hover:text-white" onClick={() => setSelected(null)}>
                      ✕
                    </button>
                  }
                >
                  <input
                    key={`name-${current.id}`}
                    defaultValue={current.name}
                    onBlur={(e) =>
                      e.target.value.trim() &&
                      e.target.value !== current.name &&
                      updateObject(current.id, { name: e.target.value.trim() })
                    }
                    onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                    className="w-full rounded-md border border-white/10 bg-black/25 px-2 py-1 text-xs font-semibold text-white outline-none focus:border-sky-300/60"
                  />
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span className="text-[10px] text-white/45">Group</span>
                    <input
                      key={`group-${current.id}`}
                      list="harbor-groups"
                      defaultValue={current.group}
                      onBlur={(e) =>
                        e.target.value.trim() &&
                        e.target.value !== current.group &&
                        updateObject(current.id, { group: e.target.value.trim() })
                      }
                      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                      className="min-w-0 flex-1 rounded-md border border-white/10 bg-black/25 px-2 py-0.5 text-[11px] text-white outline-none focus:border-sky-300/60"
                    />
                    <datalist id="harbor-groups">
                      {groups.map((g) => (
                        <option key={g.name} value={g.name} />
                      ))}
                    </datalist>
                  </div>
                  <p className="mt-1.5 text-[10px] leading-relaxed text-white/45">
                    {currentDef
                      ? fileOf(currentDef, source).replace(/^\/models\//, '')
                      : `unknown model ${current.model}`}
                    {currentModel && currentDef && (
                      <>
                        <br />
                        {count(currentModel.triangles)} tris · {mb(currentModel.bytes)} · ×
                        {(baseScale(currentModel, currentDef) * current.scale[1]).toFixed(2)} of the export ·{' '}
                        {(
                          (currentModel.box.max.y - currentModel.box.min.y) *
                          baseScale(currentModel, currentDef) *
                          current.scale[1]
                        ).toFixed(1)}{' '}
                        u tall
                      </>
                    )}
                  </p>
                  {(
                    [
                      ['Position', 'position', 0.1, 2],
                      ['Rotation °', 'rotation', 5, 1],
                      ['Scale', 'scale', 0.05, 3]
                    ] as const
                  ).map(([name, key, step, digits]) => (
                    <div key={key} className="mt-2">
                      <p className="text-[10px] text-white/50">{name}</p>
                      <div className="mt-0.5 grid grid-cols-3 gap-1">
                        {(['x', 'y', 'z'] as const).map((axis, i) => (
                          <NumberField
                            key={axis}
                            prefix={axis}
                            value={current[key][i]}
                            step={step}
                            digits={digits}
                            onCommit={(v) => {
                              const next = [...current[key]] as Vec3
                              next[i] = v
                              updateObject(current.id, { [key]: next })
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span className="text-[10px] text-white/50">Uniform</span>
                    <div className="w-20">
                      <NumberField
                        value={current.scale[1]}
                        step={0.05}
                        digits={3}
                        onCommit={(v) => {
                          if (v <= 0) return
                          const k = v / (current.scale[1] || 1)
                          updateObject(current.id, { scale: current.scale.map((s) => +(s * k).toFixed(4)) as Vec3 })
                        }}
                      />
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <button className={chip(false)} onClick={() => drop(current.id)} title="G">
                      Drop to ground
                    </button>
                    <button className={chip(false)} onClick={() => focusOn(current)} title="F">
                      Centre view
                    </button>
                    <button className={chip(false)} onClick={() => duplicate(current.id)} title="⌘D">
                      Duplicate
                    </button>
                    <button
                      className={chip(false)}
                      onClick={() => updateObject(current.id, { visible: !current.visible })}
                    >
                      {current.visible ? 'Hide' : 'Show'}
                    </button>
                    <button
                      className={`${chip(false)} border-rose-300/30 text-rose-200`}
                      onClick={() => remove(current.id)}
                      title="⌫"
                    >
                      Delete
                    </button>
                  </div>
                </Section>
              ) : (
                <Section title="Selected">
                  <p className="text-[11px] leading-relaxed text-white/45">
                    Click a model, or pick one from the list. W / E / R move, turn and scale it; G drops it to the
                    ground; ⌘D duplicates; ⌫ deletes; ⌘Z undoes.
                  </p>
                </Section>
              )}

              <Section title="Camera">
                <div className="flex flex-wrap gap-1.5">
                  <button
                    className={chip(false)}
                    onClick={() => api.current.rotateBy?.(-WORLD_BUILDER_CAMERA.rotate.buttonStep)}
                    title="Turn left (←)"
                  >
                    ↺ 45°
                  </button>
                  <button
                    className={chip(false)}
                    onClick={() => api.current.rotateBy?.(WORLD_BUILDER_CAMERA.rotate.buttonStep)}
                    title="Turn right (→)"
                  >
                    ↻ 45°
                  </button>
                  <button
                    className={chip(false)}
                    onClick={() => api.current.resetCamera?.()}
                    title="Reset camera (Home)"
                  >
                    Reset camera
                  </button>
                  <button
                    className={chip(false)}
                    onClick={() => {
                      const v = api.current.currentView?.()
                      if (
                        v &&
                        window.confirm('Make this framing the approved view? (It is kept at the default direction.)')
                      )
                        commit((s) => ({ ...s, camera: v }))
                    }}
                  >
                    Approve this view
                  </button>
                </div>
                <p className="mt-1.5 text-[10px] leading-relaxed text-white/45">
                  True isometric: the tilt is fixed at {WORLD_BUILDER_CAMERA.elevation.toFixed(2)}°, orthographic. Drag
                  to pan · scroll or pinch to zoom · right-drag, ⌥-drag, ← → or a two-finger twist to turn.
                </p>
              </Section>

              <Section title="Reference">
                <div className="flex flex-wrap gap-1.5">
                  <button
                    className={chip(overlay.on)}
                    onClick={() => setOverlay((o: { on: boolean; opacity: number }) => ({ ...o, on: !o.on }))}
                    title="O"
                  >
                    Overlay {overlay.on ? 'on' : 'off'}
                  </button>
                </div>
                {scene.reference ? (
                  <>
                    <Slider
                      name="Opacity"
                      value={overlay.opacity}
                      shown={`${Math.round(overlay.opacity * 100)}%`}
                      min={0.05}
                      max={1}
                      step={0.05}
                      onChange={(v) => setOverlay({ on: true, opacity: v })}
                    />
                    <p className="mt-1 text-[10px] text-white/40">Lines up at the approved view.</p>
                  </>
                ) : (
                  <p className="mt-1 text-[10px] text-white/40">
                    This scene has no reference image: the overlay shows the approved view&apos;s frame.
                  </p>
                )}
              </Section>

              <Section title="View">
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      ['finish', 'World finish'],
                      ['shadows', 'Shadows'],
                      ['ocean', 'Ocean'],
                      ['wireframe', 'Wireframe'],
                      ['lessGloss', 'Matte']
                    ] as [keyof EditorSettings, string][]
                  ).map(([k, name]) => (
                    <button
                      key={k}
                      className={chip(settings[k])}
                      onClick={() => setSettings((s) => ({ ...s, [k]: !s[k] }))}
                    >
                      {name}
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <button className={chip(source === 'cleaned')} onClick={() => setSource('cleaned')}>
                    Land: water removed
                  </button>
                  <button className={chip(source === 'original')} onClick={() => setSource('original')}>
                    As exported
                  </button>
                  <button
                    className={chip(source === 'draft')}
                    onClick={() => setSource('draft')}
                    title="~10% triangles — run scripts/environment/draft-decimator.mjs first"
                  >
                    Draft quality
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <button
                    className={chip(settings.lod)}
                    onClick={() => setSettings((s) => ({ ...s, lod: !s.lod }))}
                    title="Screen-space LOD: swap to lower geometry at distance"
                  >
                    LOD
                  </button>
                  {settings.lod && (
                    <button
                      className={chip(settings.lodDebug)}
                      onClick={() => setSettings((s) => ({ ...s, lodDebug: !s.lodDebug }))}
                      title="Color wireframe overlay by LOD level"
                    >
                      LOD debug
                    </button>
                  )}
                </div>
                {settings.lod && lodStats.high + lodStats.medium + lodStats.low > 0 && (
                  <div className="mt-1.5 flex gap-3 text-[10px] font-mono">
                    <span style={{ color: '#6ee7b7' }}>H {lodStats.high}</span>
                    <span style={{ color: '#fbbf24' }}>M {lodStats.medium}</span>
                    <span style={{ color: '#f87171' }}>L {lodStats.low}</span>
                    <span className="text-white/45">
                      in view {lodStats.drawn}/{lodStats.objects}
                    </span>
                  </div>
                )}
              </Section>

              <Section title="Cost of what's drawn">
                <table className="w-full text-[11px] text-white/75">
                  <tbody>
                    <tr>
                      <td>Objects ({cost.rows.length} models)</td>
                      <td className="text-right font-mono">{cost.instances}</td>
                    </tr>
                    <tr>
                      <td>Model triangles</td>
                      <td className="text-right font-mono">{count(cost.triangles)}</td>
                    </tr>
                    <tr>
                      <td>Downloaded</td>
                      <td className="text-right font-mono">{mb(cost.files)}</td>
                    </tr>
                    <tr>
                      <td>Textures on the GPU</td>
                      <td className="text-right font-mono">{mb(cost.textures)}</td>
                    </tr>
                  </tbody>
                </table>
                <p className={`${label} mt-2`}>Heaviest</p>
                <table className="mt-1 w-full text-[10px] text-white/60">
                  <tbody>
                    {cost.rows.slice(0, 6).map((r) => (
                      <tr key={r.id}>
                        <td className="truncate pr-1">
                          {r.name} {r.n > 1 && <span className="text-white/35">×{r.n}</span>}
                        </td>
                        <td className="text-right font-mono">{count(r.triangles)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Section>

              <Section title="Profiler">
                <div className="flex flex-wrap gap-1.5">
                  <button className={chip(benchmarking)} onClick={runBenchmark} disabled={benchmarking || !allReady}>
                    {benchmarking ? `Testing: ${benchPhase}` : 'Run benchmark'}
                  </button>
                  {benchResults && !benchmarking && (
                    <button className={chip(false)} onClick={() => setBenchResults(null)}>
                      Dismiss
                    </button>
                  )}
                </div>
                <p className="mt-1 text-[10px] text-white/40">
                  Runs 5 configs for 4 s each. Forces continuous rendering to measure per-frame cost.
                </p>
              </Section>
            </div>
          </div>
        </>
      )}

      {benchResults && !benchmarking && (
        <BenchmarkOverlay
          results={benchResults}
          scene={sceneName}
          source={source}
          textures={cost.textures}
          modelTris={cost.triangles}
          models={cost.rows.length}
          instances={cost.instances}
          onClose={() => setBenchResults(null)}
        />
      )}

      <FrameBar
        frame={panels ? frame : null}
        extra={
          <span className="whitespace-nowrap">
            <span className="text-white/45">scene tris</span> <span className="font-mono">{count(cost.triangles)}</span>
          </span>
        }
      />
    </div>
  )
}
