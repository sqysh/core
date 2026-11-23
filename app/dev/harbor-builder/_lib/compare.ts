import { Vector3 } from 'three'
import { at } from '@/app/dev/lighthouse/_lib/world'
import { compose, Transform } from './ground'
import { LoadedModel } from './models'

// The terrain comparison: the two back cliffs as Meshy exported them, the same two with their painted water removed,
// and the one formation Blender made of them (scripts/environment/sculpt-merge.py), side by side over the sea. The pair
// is set exactly as the merge script set it, from the script's own report, so all three line up rock for rock.

const base = '/models/environment-derived/sculpted/back-cliffs-merged-01'
export const MERGED = { file: `${base}.glb`, report: `${base}.json` }

export type MergeSource = {
  file: string
  /** Its wider side, world units */
  size: number
  x: number
  z: number
  /** The share of its height under the water */
  sink: number
  scale: number
  height: number
  triangles: number
}

export type MergeReport = {
  sources: MergeSource[]
  voxelSize: number
  seaFloorCut: number
  fillet: { reach: number; passes: number; vertices: number }
  trianglesBeforeDecimation: number
  triangles: number
  atlas: { color: number; normal: number; roughness: number }
  bytes: number
}

export type ExhibitId = 'original' | 'cleaned' | 'merged'

/** The three, left to right on screen (u), each round its own middle */
export const EXHIBITS: { id: ExhibitId; name: string; u: number }[] = [
  { id: 'original', name: 'Original two cliffs', u: -27 },
  { id: 'cleaned', name: 'Cleaned cliffs', u: 0 },
  { id: 'merged', name: 'Sculpted formation', u: 27 }
]

export const exhibitCentre = (id: ExhibitId) => at(EXHIBITS.find((e) => e.id === id)!.u, 0)

/** The files an exhibit's sources load from */
export const sourceFile = (src: MergeSource, exhibit: 'original' | 'cleaned') =>
  `/models/${exhibit === 'original' ? 'environment' : 'environment-derived/cleaned'}/terrain/${src.file}`

/** One of the pair as the merge script placed it: wider side scaled to `size`, its box's middle over (x, z), sunk */
export function pairTransform(model: LoadedModel, src: MergeSource, exhibit: ExhibitId): Transform {
  const box = model.box
  const s = src.size / Math.max(box.max.x - box.min.x, box.max.z - box.min.z)
  const height = (box.max.y - box.min.y) * s
  const [ox, oz] = exhibitCentre(exhibit)
  const position = new Vector3(
    ox + src.x - ((box.min.x + box.max.x) / 2) * s,
    -box.min.y * s - height * src.sink,
    oz + src.z - ((box.min.z + box.max.z) / 2) * s
  )
  return { position, yaw: 0, scale: s, height, ...compose(position, 0, s) }
}

/** The formation: exported in the pair's world units, so it only moves to its exhibit */
export function mergedTransform(model: LoadedModel): Transform {
  const [ox, oz] = exhibitCentre('merged')
  const position = new Vector3(ox, 0, oz)
  return { position, yaw: 0, scale: 1, height: model.box.max.y - model.box.min.y, ...compose(position, 0, 1) }
}

export type ComparePiece = { exhibit: ExhibitId; key: string; model: LoadedModel; transform: Transform }

/** Every drawn piece of the comparison, as land (for the sea's depth map) and for drawing */
export function comparePieces(
  report: MergeReport | null,
  loaded: Record<string, LoadedModel | undefined>
): ComparePiece[] {
  if (!report) return []
  const out: ComparePiece[] = []
  for (const exhibit of ['original', 'cleaned'] as const)
    for (const src of report.sources) {
      const model = loaded[sourceFile(src, exhibit)]
      if (model)
        out.push({ exhibit, key: `${exhibit}-${src.file}`, model, transform: pairTransform(model, src, exhibit) })
    }
  const merged = loaded[MERGED.file]
  if (merged) out.push({ exhibit: 'merged', key: 'merged', model: merged, transform: mergedTransform(merged) })
  return out
}
