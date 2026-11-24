// Fails when a serverless function would be too big for Vercel. Run after `next build`.
//
//   node scripts/check-function-size.mjs            the largest functions, and exit 1 if any is over the limit
//   node scripts/check-function-size.mjs --all      every function
//
// Next writes a trace (*.nft.json) next to each server entry listing the files the function needs; Vercel packs exactly
// those into the function and allows 250 MB uncompressed. Files in node_modules count (Vercel installs them), project
// files count only if they are committed (a git-ignored file isn't in the deployment), so the estimate matches what
// Vercel sees from a clean checkout. Without git (a build container) every traced file is counted.
//
// A function that pulls in public/ (the GLB model library) is the usual failure: a directory scan with a dynamic path
// can't be traced precisely, so everything under it is included. Keep such routes out with outputFileTracingExcludes.

import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'

const ROOT = process.cwd()
const LIMIT = 250 * 1024 * 1024
const WARN = 150 * 1024 * 1024
const mb = (b) => `${(b / 1048576).toFixed(1).padStart(8)} MB`

let tracked = null
try {
  tracked = new Set(execFileSync('git', ['ls-files', '-z'], { cwd: ROOT, maxBuffer: 256 * 1024 * 1024 }).toString().split('\0'))
} catch {
  // no git here: count every traced file
}

const traces = []
const walk = (dir) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) walk(p)
    else if (e.name.endsWith('.nft.json')) traces.push(p)
  }
}
const serverDir = join(ROOT, '.next', 'server')
if (!existsSync(serverDir)) {
  console.error('check-function-size: no .next/server, run `next build` first')
  process.exit(2)
}
walk(serverDir)

const sizeOf = (trace) => {
  const base = dirname(trace)
  const seen = new Set()
  let total = 0
  const groups = new Map()
  for (const f of JSON.parse(readFileSync(trace, 'utf8')).files) {
    const p = resolve(base, f)
    if (seen.has(p)) continue
    seen.add(p)
    let st
    try {
      st = statSync(p)
    } catch {
      continue
    }
    if (!st.isFile()) continue
    const rel = relative(ROOT, p)
    if (!rel.startsWith('node_modules') && tracked && !tracked.has(rel)) continue
    total += st.size
    const group = rel.startsWith('node_modules') ? 'node_modules' : rel.split('/').slice(0, 3).join('/')
    groups.set(group, (groups.get(group) ?? 0) + st.size)
  }
  return { total, files: seen.size, groups }
}

const rows = traces
  .map((t) => ({ name: relative(serverDir, t).replace(/\.nft\.json$/, ''), ...sizeOf(t) }))
  .sort((a, b) => b.total - a.total)

const all = process.argv.includes('--all')
console.log(`function size (uncompressed, as Vercel would pack it; limit ${mb(LIMIT).trim()}), ${rows.length} functions`)
for (const r of rows.slice(0, all ? rows.length : 5)) console.log(`${mb(r.total)}  ${String(r.files).padStart(5)} files  ${r.name}`)

const over = rows.filter((r) => r.total > LIMIT)
const near = rows.filter((r) => r.total > WARN && r.total <= LIMIT)
for (const r of near) console.warn(`warning: ${r.name} is ${mb(r.total).trim()}, over 60% of the limit`)
if (over.length) {
  for (const r of over) {
    console.error(`\nERROR: ${r.name} is ${mb(r.total).trim()}, over Vercel's 250 MB limit. Largest contents:`)
    for (const [g, s] of [...r.groups].sort((a, b) => b[1] - a[1]).slice(0, 5)) console.error(`  ${mb(s)}  ${g}`)
  }
  process.exit(1)
}
console.log('every function is within the limit')
