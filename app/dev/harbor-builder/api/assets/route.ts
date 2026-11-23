import { readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { MODELS, MISLABELLED } from '../../_lib/catalog'
import type { ModelDef, ModelKind } from '../../_lib/catalog'

// Scans public/models/environment for all GLBs, cross-references against the catalog, and returns
// enriched metadata (file size, cleaned-derivative presence, whether it was auto-discovered). Dev only.

export const dynamic = 'force-dynamic'

const ENV_BASE = '/models/environment'
const pubRoot = join(process.cwd(), 'public')
const pubPath = (rel: string) => join(pubRoot, rel.startsWith('/') ? rel.slice(1) : rel)
const cleanedPath = (file: string) =>
  file.replace('/models/environment/', '/models/environment-derived/cleaned/')

async function bytes(p: string) {
  try {
    return (await stat(p)).size
  } catch {
    return 0
  }
}

async function scanGlbs(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => [])
  const files: string[] = []
  for (const e of entries) {
    const full = join(dir, e.name)
    if (e.isDirectory()) files.push(...(await scanGlbs(full)))
    else if (e.name.endsWith('.glb')) files.push(full.replace(pubRoot, '').replace(/\\/g, '/'))
  }
  return files
}

const DIR_KINDS: Record<string, ModelKind> = {
  terrain: 'land',
  'terrain-test': 'land',
  islands: 'islet',
  paths: 'path',
  structures: 'structure',
  trees: 'tree',
  plants: 'plant',
}

function inferDef(file: string): Omit<ModelDef, 'cleaned' | 'free'> {
  const rel = file.replace(`${ENV_BASE}/`, '')
  const slash = rel.indexOf('/')
  const dir = slash >= 0 ? rel.slice(0, slash) : ''
  const basename = rel.split('/').at(-1)!.replace('.glb', '').replace(/-\d+$/, '')
  const name = basename.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  return {
    id: basename,
    name,
    file,
    kind: DIR_KINDS[dir] ?? 'prop',
    size: 10,
    by: 'width',
  }
}

export async function GET() {
  if (process.env.NODE_ENV !== 'development') return new Response('', { status: 404 })

  const envDir = join(pubRoot, 'models', 'environment')
  const diskFiles = new Set(await scanGlbs(envDir))
  const catalogIds = new Set(MODELS.map((d) => d.id))
  const catalogFiles = new Set(MODELS.map((d) => d.file))
  const mislabelled = new Set(MISLABELLED.map((m) => `${ENV_BASE}/${m.file}`))

  const catalogEntries = await Promise.all(
    MODELS.map(async (d) => {
      const fileSize = await bytes(pubPath(d.file))
      const cleanFile = cleanedPath(d.file)
      const cleanSize = d.cleaned ? await bytes(pubPath(cleanFile)) : 0
      return {
        ...d,
        fileBytes: fileSize,
        cleanedBytes: cleanSize,
        hasClean: cleanSize > 0,
        inCatalog: true,
        discovered: false,
      }
    }),
  )

  const discoveredEntries = [...diskFiles]
    .filter((f) => !catalogFiles.has(f) && !mislabelled.has(f))
    .map((f) => {
      const inferred = inferDef(f)
      if (catalogIds.has(inferred.id)) inferred.id = `${inferred.id}-discovered`
      return { ...inferred, fileBytes: 0, cleanedBytes: 0, hasClean: false, inCatalog: false, discovered: true }
    })

  return Response.json({
    entries: [...catalogEntries, ...discoveredEntries],
    total: catalogEntries.length + discoveredEntries.length,
    uncatalogued: discoveredEntries.length,
  })
}
