import { mkdir, readdir, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

// Named scene management: list all scenes, create new ones. The harbor scene lives at its existing
// path for backward compat; all other scenes go in assets/environment/scenes/.

export const dynamic = 'force-dynamic'

const HARBOR_WORKING = join(process.cwd(), 'assets/environment/harbor/harbor-scene.json')
const SCENES_DIR = join(process.cwd(), 'assets/environment/scenes')
const headers = { 'content-type': 'application/json', 'cache-control': 'no-store' }
const notFound = () => new Response('', { status: 404 })

export async function GET() {
  if (process.env.NODE_ENV !== 'development') return notFound()

  await mkdir(SCENES_DIR, { recursive: true })

  const named = await readdir(SCENES_DIR)
    .then((files) => files.filter((f) => f.endsWith('.json') && !f.endsWith('.baseline.json')).map((f) => f.slice(0, -5)))
    .catch(() => [])

  // Harbor always first; it may live at the old path rather than in scenes/
  const harborExists = await stat(HARBOR_WORKING).then(() => true).catch(() => false)
  const list = harborExists && !named.includes('harbor') ? ['harbor', ...named] : named

  return Response.json({ scenes: list }, { headers })
}

export async function POST(req: Request) {
  if (process.env.NODE_ENV !== 'development') return notFound()

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Body must be JSON' }, { status: 400, headers })
  }

  const name = (body as Record<string, unknown>)?.name
  if (!name || typeof name !== 'string' || !/^[a-z][a-z0-9-]*$/.test(name))
    return Response.json(
      { error: 'name must start with a letter and contain only a-z, 0-9 and hyphens' },
      { status: 400, headers },
    )

  if (name === 'harbor')
    return Response.json({ error: '"harbor" is reserved for the existing scene' }, { status: 400, headers })

  await mkdir(SCENES_DIR, { recursive: true })

  const scene = {
    version: 1,
    name,
    reference: '/images/references/core-harbor-master.png',
    camera: { azimuth: 45, elevation: 35, target: [0, 0, 0] as [number, number, number], width: 60, aspect: 1.7747 },
    objects: [],
  }

  try {
    await writeFile(join(SCENES_DIR, `${name}.json`), `${JSON.stringify(scene, null, 2)}\n`, {
      flag: 'wx',
    })
  } catch (e: unknown) {
    const code = (e as NodeJS.ErrnoException).code
    if (code === 'EEXIST')
      return Response.json({ error: `Scene "${name}" already exists` }, { status: 409, headers })
    throw e
  }

  return Response.json({ created: name }, { headers })
}
