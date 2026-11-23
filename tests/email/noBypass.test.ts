// The guard only protects what goes through it. This fails the moment any code sends email some other way: builds its
// own Resend client, calls the provider API directly, or adds a cron route that mails members without the campaign checks.
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const root = process.cwd()
let passed = 0
const test = (name: string, fn: () => void) => {
  fn()
  passed++
  console.log('  ✓', name)
}

const files: string[] = []
const walk = (dir: string) => {
  for (const n of readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.next', '.git', 'generated', 'DerivedData'].includes(n.name)) continue
    const p = join(dir, n.name)
    if (n.isDirectory()) walk(p)
    else if (/\.(ts|tsx|js|mjs|cjs)$/.test(n.name) && statSync(p).size < 2_000_000) files.push(p)
  }
}
for (const top of ['app', 'lib', 'scripts', 'components']) walk(join(root, top))
const text = new Map(files.map((f) => [relative(root, f), readFileSync(f, 'utf8')]))

test('the only unguarded Resend client is the one the shared guarded clients wrap', () => {
  const offenders: string[] = []
  for (const [file, src] of text) {
    if (!/new Resend\(/.test(src)) continue
    if (file === 'lib/resend/resend.ts' && /guardResend\(client\)/.test(src)) continue
    // a plain Node script (it cannot import the app's alias) may build its own, wrapped in the same guard
    if (file.startsWith('scripts/') && /guardResend\(new Resend\(/.test(src)) continue
    offenders.push(file)
  }
  assert.deepEqual(offenders, [], `build clients through lib/resend/resend.ts: ${offenders.join(', ')}`)
})

test('every file that sends email gets its client from the guard', () => {
  const offenders: string[] = []
  for (const [file, src] of text) {
    if (file.startsWith('tests/') || file === 'lib/email/delivery.ts') continue
    if (!/\.(emails|batch)\.(send|create)\(/.test(src)) continue
    if (/from '@\/lib\/resend\/resend'/.test(src) || /guardResend\(/.test(src)) continue
    offenders.push(file)
  }
  assert.deepEqual(offenders, [], `these send email without the guard: ${offenders.join(', ')}`)
})

test('nothing calls the provider\'s HTTP API directly', () => {
  const offenders = [...text].filter(([f, s]) => f !== 'lib/email/delivery.ts' && /api\.resend\.com|api\.sendgrid\.com|api\.mailgun\.net|smtp\./i.test(s)).map(([f]) => f)
  assert.deepEqual(offenders, [])
})

test('every cron route that emails members or reorders shared data is authorized, planned and claimed', () => {
  const routes = [...text.keys()].filter((f) => /^app\/api\/cron\/[^/]+\/route\.ts$/.test(f))
  assert.ok(routes.length >= 5, `found ${routes.length} cron routes`)
  const missing: string[] = []
  for (const r of routes) {
    const src = text.get(r) as string
    const viaCampaign = /prepareCampaign\(/.test(src)
    const viaClaim = /requireCron\(/.test(src) && /claimRun\(/.test(src)
    if (!viaCampaign && !viaClaim) missing.push(r)
  }
  assert.deepEqual(missing, [], `unprotected cron routes: ${missing.join(', ')}`)
})

test('every cron route in vercel.json exists as a route file (and none is unlisted by accident)', () => {
  const vercel = JSON.parse(readFileSync(join(root, 'vercel.json'), 'utf8'))
  const scheduled = (vercel.crons as { path: string }[]).map((c) => c.path).sort()
  const routes = [...text.keys()].filter((f) => /^app\/api\/cron\/[^/]+\/route\.ts$/.test(f)).map((f) => '/' + f.replace(/^app\//, '').replace(/\/route\.ts$/, '')).sort()
  assert.deepEqual(routes, scheduled)
})

console.log(`\n${passed} no-bypass tests passed`)
