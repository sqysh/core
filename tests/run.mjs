// Minimal test runner: executes each *.test.ts under tests/ with the project's own jiti ('@/…' resolves to the repo
// root; 'server-only' to an empty module, since it only guards against client bundles). A test file passes when it
// finishes without throwing. No framework.
//
//   node tests/run.mjs                 safe local tests (pure; no network, no database)
//   node tests/run.mjs --integration   database integration tests (*.integration.test.ts), behind tests/_support/db-guard.mjs
import { readdirSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createJiti } from 'jiti'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const integration = process.argv.includes('--integration')

const files = readdirSync(here, { recursive: true, encoding: 'utf8' })
  .filter((f) => f.endsWith('.test.ts') && f.endsWith('.integration.test.ts') === integration)
  .sort()
  .map((f) => join(here, f))

if (!files.length) {
  console.error('No test files found.')
  process.exit(1)
}

if (integration) {
  const { prepareDatabase } = await import('./_support/db-guard.mjs')
  prepareDatabase()
}

const jiti = createJiti(import.meta.url, {
  alias: { '@': root, 'server-only': join(here, '_support/empty.cjs') },
  jsx: true,
  interopDefault: true,
  moduleCache: false
})

let failed = 0
for (const file of files) {
  console.log(`\n${relative(root, file)}`)
  try {
    await jiti.import(file)
  } catch (e) {
    failed++
    console.error(`  ✗ ${e instanceof Error ? (e.stack ?? e.message) : e}`)
  }
}

console.log(`\n${files.length - failed}/${files.length} test files passed`)
process.exit(failed ? 1 : 0)
