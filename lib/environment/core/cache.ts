import { AssetBuild, AssetRecipe, Level } from './types'

// Built assets are kept and shared: the same recipe, seed and level of detail is only ever built once (asking again
// while it's still building gets the same build). Oldest builds are released, their geometry freed, past LIMIT.

const LIMIT = 24
const builds = new Map<string, Promise<AssetBuild>>()

export function buildAsset(recipe: AssetRecipe, seed: number, level: Level): Promise<AssetBuild> {
  if (!recipe.build) throw new Error(`${recipe.id} is not built yet`)
  if (level === 'original' && !recipe.original) throw new Error(`${recipe.id} has no original to compare with`)
  const key = `${recipe.id}:${seed}:${level}`
  const hit = builds.get(key)
  if (hit) {
    builds.delete(key)
    builds.set(key, hit)
    return hit
  }
  const built = level === 'original' ? recipe.original!() : recipe.build({ seed, lod: level })
  builds.set(key, built)
  // a failed build (a model that didn't load) can be asked for again
  built.catch(() => builds.get(key) === built && builds.delete(key))
  while (builds.size > LIMIT) {
    const [oldest, old] = builds.entries().next().value as [string, Promise<AssetBuild>]
    builds.delete(oldest)
    old.then((b) => b.parts.forEach((p) => p.geometry.dispose())).catch(() => {})
  }
  return built
}
