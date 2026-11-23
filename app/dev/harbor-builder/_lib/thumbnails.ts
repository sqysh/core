import {
  AmbientLight,
  Box3,
  DirectionalLight,
  Mesh,
  NeutralToneMapping,
  OrthographicCamera,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three'
import type { LoadedModel } from './models'

// A single shared offscreen WebGL renderer for generating model thumbnails. One context is created
// on first use and reused for every model — this avoids hitting Chrome's WebGL context limit while
// still producing 3D previews identical in angle and lighting to the editor view.

const SIZE = 96
const cache = new Map<string, string>()
let _renderer: WebGLRenderer | null = null
let _scene: Scene | null = null
let _camera: OrthographicCamera | null = null

function boot() {
  if (_renderer) return
  _renderer = new WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true })
  _renderer.setSize(SIZE, SIZE)
  _renderer.setPixelRatio(1)
  _renderer.toneMapping = NeutralToneMapping
  _renderer.toneMappingExposure = 1.1

  _scene = new Scene()
  _camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 1000)
  const az = 45 * (Math.PI / 180)
  const el = 35 * (Math.PI / 180)
  const D = 300
  _camera.position.set(D * Math.cos(el) * Math.sin(az), D * Math.sin(el), D * Math.cos(el) * Math.cos(az))
  _camera.lookAt(0, 0, 0)

  _scene.add(new AmbientLight(0xffffff, 1.6))
  const key = new DirectionalLight(0xfff8e0, 2.2)
  key.position.set(5, 10, 5)
  _scene.add(key)
  const fill = new DirectionalLight(0xd0e8ff, 0.6)
  fill.position.set(-5, 3, -5)
  _scene.add(fill)
}

/** Render a loaded model to a 96×96 thumbnail and cache the data URL. Synchronous. */
export function renderThumbnail(id: string, model: LoadedModel): string {
  const cached = cache.get(id)
  if (cached) return cached
  boot()
  const renderer = _renderer!
  const scene = _scene!
  const camera = _camera!

  const mesh = new Mesh(model.geometry, model.material)

  const box = new Box3().setFromObject(mesh)
  const center = box.getCenter(new Vector3())
  const size = box.getSize(new Vector3())
  const half = Math.max(size.x, size.y, size.z) * 0.65

  mesh.position.sub(center)

  camera.left = -half
  camera.right = half
  camera.top = half
  camera.bottom = -half
  camera.updateProjectionMatrix()

  scene.add(mesh)
  renderer.render(scene, camera)
  scene.remove(mesh)

  const url = renderer.domElement.toDataURL('image/webp', 0.85)
  cache.set(id, url)
  return url
}

/** Look up a cached thumbnail without triggering a render. */
export const getThumbnail = (id: string): string | null => cache.get(id) ?? null
