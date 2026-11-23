// Which addresses an automated email may ever go to. Seeded test members and other undeliverable addresses are dropped
// everywhere; real members (and addresses that merely look like test ones) are never lost.
import assert from 'node:assert/strict'
import { classifyAddress, isDeliverableAddress, normalizeAddress, partitionRecipients } from '@/lib/email/delivery'

let passed = 0
const test = (name: string, fn: () => void) => {
  fn()
  passed++
  console.log('  ✓', name)
}

// the members scripts/seed-test-members.ts creates (same slug rule), plus how they're stored
const slug = (name: string) => name.toLowerCase().replace(/[^a-z]+/g, '.')
const SEEDED_NAMES = [
  'Brendan Ward', 'Eileen Jonah', 'Martin Connolly', 'Page Driscoll', 'Kerry Casey', 'Alex Argeros', 'Angela Turpin',
  'Jackson Rogers', 'Christopher Leone', 'Dennis Ford Eagan', 'Anna Roy', 'Jake VanMeter', 'Brian Theirrien', 'Cesar Velezliriano'
]
const seeded = SEEDED_NAMES.map((n) => `${slug(n)}@seed.coretest.local`)

test('every seeded member address is excluded, as a seeded address', () => {
  assert.equal(seeded.length, 14)
  for (const a of seeded) {
    const v = classifyAddress(a)
    assert.equal(v.ok, false, a)
    assert.equal(v.reason, 'seeded-test-address', a)
  }
})

test('seeded addresses are caught however they are written', () => {
  for (const a of ['A@SEED.CORETEST.LOCAL', '  brendan.ward@seed.coretest.local  ', 'Brendan <brendan.ward@seed.coretest.local>', 'x@deep.sub.seed.coretest.local', 'x@coretest.local'])
    assert.equal(classifyAddress(a).reason, 'seeded-test-address', a)
})

test('reserved, example and private-network domains are excluded', () => {
  for (const a of ['a@b.local', 'a@b.test', 'a@b.invalid', 'a@b.example', 'a@example.com', 'a@mail.example.org', 'a@x.example.net', 'a@host.localhost', 'a@router.lan', 'a@svc.internal', 'a@pc.home', 'a@x.corp', 'a@x.localdomain'])
    assert.equal(classifyAddress(a).reason, 'reserved-domain', a)
})

test('malformed text is excluded', () => {
  for (const a of ['', '   ', 'no-at-sign', 'a@b', 'a@localhost', 'a b@c.com', 'a@@c.com', '@c.com', 'a@.com', 'a@c..com', 'a@-c.com', 'a@c.com,b@c.com', 'a@c.com;b@c.com', '<a@c.com', 'a'.repeat(250) + '@c.com'])
    assert.equal(classifyAddress(a).reason, 'malformed', JSON.stringify(a))
  for (const a of [null, undefined, 42, {}, []]) assert.equal(classifyAddress(a as never).reason, 'malformed')
})

test('real member addresses are deliverable, and normalised', () => {
  for (const a of ['rowgregory@gmail.com', 'greg@sqysh.com', 'first.last+core@coastalreferralxchange.com', 'KCasey@CCM.com', 'dev.mhdcustom@gmail.com', 'a@b.co', 'Sqysh <greg@sqysh.com>'])
    assert.equal(isDeliverableAddress(a), true, a)
  assert.equal(normalizeAddress('  KCasey@CCM.com '), 'kcasey@ccm.com')
  assert.equal(normalizeAddress('Sqysh <Greg@Sqysh.com>'), 'greg@sqysh.com')
})

test('look-alike real domains are not mistaken for test ones', () => {
  for (const a of ['a@fake.local.com', 'a@mylocal.com', 'a@testing.com', 'a@my-example.com', 'a@example.company', 'a@seed-coretest.org', 'a@coretest.com', 'a@localhost.com', 'a@invalid.io', 'a@test.co'])
    assert.equal(isDeliverableAddress(a), true, a)
})

test('EMAIL_BLOCKED_DOMAINS adds blocked domains (and their subdomains), nothing else', () => {
  const env = { EMAIL_BLOCKED_DOMAINS: 'staging-mail.com, @qa.example-corp.com' }
  assert.equal(classifyAddress('a@staging-mail.com', env).reason, 'blocked-domain')
  assert.equal(classifyAddress('a@eu.staging-mail.com', env).reason, 'blocked-domain')
  assert.equal(classifyAddress('a@qa.example-corp.com', env).reason, 'blocked-domain')
  assert.equal(isDeliverableAddress('a@example-corp.com', env), true)
  assert.equal(isDeliverableAddress('a@gmail.com', env), true)
})

test('a roster of 14 seeded and 3 real members keeps exactly the real ones, in order', () => {
  const real = [
    { id: 'u1', name: 'Greg Row', email: 'rowgregory@gmail.com' },
    { id: 'u2', name: 'Greg Sqysh', email: 'greg@sqysh.com' },
    { id: 'u3', name: 'Real Member', email: 'member@coastalreferralxchange.com' }
  ]
  const roster = [...seeded.map((email, i) => ({ id: `s${i}`, name: `Seed ${i}`, email })), ...real]
  const { eligible, excluded } = partitionRecipients(roster)
  assert.deepEqual(eligible.map((r) => r.id), ['u1', 'u2', 'u3'])
  assert.equal(excluded.length, 14)
  assert.ok(excluded.every((e) => e.reason === 'seeded-test-address'))
})

test('a repeated address is sent once (the first entry), case-insensitively', () => {
  const { eligible, excluded } = partitionRecipients([
    { id: 'a', email: 'x@gmail.com' },
    { id: 'b', email: 'X@Gmail.com' },
    { id: 'c', email: ' x@gmail.com ' },
    { id: 'd', email: 'y@gmail.com' }
  ])
  assert.deepEqual(eligible.map((r) => r.id), ['a', 'd'])
  assert.deepEqual(excluded.map((e) => [e.recipient.id, e.reason]), [['b', 'duplicate'], ['c', 'duplicate']])
})

test('an empty list and an all-real list pass through untouched', () => {
  assert.deepEqual(partitionRecipients([]), { eligible: [], excluded: [] })
  const all = [{ email: 'a@gmail.com' }, { email: 'b@yahoo.com' }]
  assert.deepEqual(partitionRecipients(all).eligible, all)
})

console.log(`\n${passed} eligibility tests passed`)
