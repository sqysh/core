// The meeting simulation is on only for the local dev server, deliberately switched on, and never on a deployment; and
// the Pusher channel is the production name everywhere except development.
import assert from 'node:assert/strict'

const env = process.env as Record<string, string | undefined>
const saved = { ...env }
const reset = () => {
  for (const k of ['NODE_ENV', 'DEV_SIMULATE_MEETING', 'VERCEL'])
    saved[k] === undefined ? delete env[k] : (env[k] = saved[k])
}
const load = async <T>(path: string): Promise<T> => {
  // a fresh copy each time: the channel name is decided when its module loads
  const { createJiti } = await import('jiti')
  return createJiti(import.meta.url, { alias: { '@': process.cwd() }, moduleCache: false }).import<T>(path)
}

let passed = 0
const test = async (name: string, fn: () => Promise<void>) => {
  try {
    await fn()
  } finally {
    reset()
  }
  passed++
  console.log('  ✓', name)
}
const open = async () =>
  (await load<typeof import('@/lib/utils/devSimulation')>('@/lib/utils/devSimulation')).simulatedMeetingOpen()
const channel = async () =>
  (
    await load<typeof import('@/lib/constants/attendance-channel.constants')>(
      '@/lib/constants/attendance-channel.constants'
    )
  ).MEETING_ATTENDANCE_CHANNEL

await test('the simulation is on only in development, with the switch on, off Vercel', async () => {
  env.NODE_ENV = 'development'
  delete env.VERCEL
  env.DEV_SIMULATE_MEETING = '1'
  assert.equal(await open(), true)
  env.DEV_SIMULATE_MEETING = '0'
  assert.equal(await open(), false)
  delete env.DEV_SIMULATE_MEETING
  assert.equal(await open(), false)
  env.DEV_SIMULATE_MEETING = '1'
  env.VERCEL = '1'
  assert.equal(await open(), false)
})

await test('production never simulates, whatever is set', async () => {
  env.NODE_ENV = 'production'
  env.DEV_SIMULATE_MEETING = '1'
  assert.equal(await open(), false)
  env.NODE_ENV = 'test'
  assert.equal(await open(), false)
})

await test('events go to the real channel in production and to a separate one in development', async () => {
  env.NODE_ENV = 'production'
  assert.equal(await channel(), 'meeting-attendance')
  env.NODE_ENV = 'development'
  assert.equal(await channel(), 'dev-meeting-attendance')
})

console.log(`devSimulation: ${passed} passed`)
