import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { parseScene } from '../_lib/scene'

// The harbor editor's scene file, read and written in development only. The existing harbor scene
// lives at assets/environment/harbor/ for backward compat; other named scenes live under
// assets/environment/scenes/. The ?name= param selects the scene (defaults to "harbor").
//
// GET answers the working scene (or, until first save, the baseline; ?from=baseline asks for it
// directly). PUT replaces the working scene atomically. The baseline is never written here.

const HARBOR_DIR = join(process.cwd(), 'assets/environment/harbor')
const HARBOR_WORKING = join(HARBOR_DIR, 'harbor-scene.json')
const HARBOR_BASELINE = join(HARBOR_DIR, 'harbor-scene.baseline.json')
const SCENES_DIR = join(process.cwd(), 'assets/environment/scenes')

function scenePaths(name: string) {
  if (!/^[a-z][a-z0-9-]*$/.test(name)) throw new Error(`Invalid scene name: ${name}`)
  if (name === 'harbor') return { working: HARBOR_WORKING, baseline: HARBOR_BASELINE }
  return {
    working: join(SCENES_DIR, `${name}.json`),
    baseline: join(SCENES_DIR, `${name}.baseline.json`),
  }
}

const notFound = () => new Response('Not found', { status: 404 })
const headers = { 'content-type': 'application/json', 'cache-control': 'no-store' }

async function read(path: string) {
  try {
    return await readFile(path, 'utf8')
  } catch {
    return null
  }
}

export async function GET(req: Request) {
  if (process.env.NODE_ENV !== 'development') return notFound()
  const params = new URL(req.url).searchParams
  const name = params.get('name') ?? 'harbor'
  let paths
  try {
    paths = scenePaths(name)
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400, headers })
  }
  const baselineOnly = params.get('from') === 'baseline'
  const working = baselineOnly ? null : await read(paths.working)
  const text = working ?? (await read(paths.baseline))
  if (text === null) return Response.json({ error: 'No scene file yet' }, { status: 404, headers })
  return new Response(text, { headers: { ...headers, 'x-scene-source': working ? 'working' : 'baseline' } })
}

export async function PUT(req: Request) {
  if (process.env.NODE_ENV !== 'development') return notFound()
  const params = new URL(req.url).searchParams
  const name = params.get('name') ?? 'harbor'
  let paths
  try {
    paths = scenePaths(name)
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400, headers })
  }
  let scene
  try {
    scene = parseScene(await req.json())
  } catch (e) {
    return Response.json({ error: `Not a scene: ${(e as Error).message}` }, { status: 400, headers })
  }
  await mkdir(dirname(paths.working), { recursive: true })
  const tmp = `${paths.working}.${process.pid}.tmp`
  await writeFile(tmp, `${JSON.stringify(scene, null, 2)}\n`)
  await rename(tmp, paths.working)
  return Response.json({ saved: scene.objects.length }, { headers })
}
