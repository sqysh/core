import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

// Serves master models to the environment workshop, read-only, so optimised levels can be compared with them. Masters
// live outside public/ (they're tens of megabytes and never ship); this exists in development only, and serves only the
// masters listed here.

const MASTERS: Record<string, string> = {
  'granite-headland.glb': 'assets/environment/masters/granite/granite-headland.glb',
  'eastern-white-pine.glb': 'assets/environment/masters/trees/eastern-white-pine.glb',
  'coastal-oak.glb': 'assets/environment/masters/trees/coastal-oak.glb',
  'beach-rose.glb': 'assets/environment/masters/shrubs/beach-rose.glb'
}

export async function GET(_req: Request, ctx: RouteContext<'/dev/environment-kit/masters/[file]'>) {
  if (process.env.NODE_ENV !== 'development') return new Response('Not found', { status: 404 })
  const path = MASTERS[(await ctx.params).file]
  if (!path) return new Response('Not found', { status: 404 })
  const bytes = await readFile(join(process.cwd(), path))
  return new Response(new Uint8Array(bytes), {
    headers: { 'content-type': 'model/gltf-binary', 'content-length': String(bytes.length), 'cache-control': 'no-store' }
  })
}
