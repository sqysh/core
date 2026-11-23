// Who the Sqysh Google review reminder must never go to: members who already reviewed, under every address they hold.
// Pure logic, no database and no mail provider.
import assert from 'node:assert/strict'
import { planCampaign } from '@/lib/email/campaign'
import { addressKey, ReviewedMember, SQYSH_REVIEWED, splitReviewed } from '@/lib/email/sqyshReviewed'

let passed = 0
const test = (name: string, fn: () => void) => {
  fn()
  passed++
  console.log('  ✓', name)
}

type M = { id: string; name: string; email: string; alternateEmails?: { email: string }[] }
const member = (id: string, name: string, email: string, alts: string[] = []): M => ({ id, name, email, alternateEmails: alts.map((email) => ({ email })) })

const KERRY = member('u-kerry', 'Kerry Casey', 'kcasey@ccm.com', ['kerry.casey.personal@gmail.com'])
const ANGELA = member('u-angela', 'Angela Turpin', 'aturpin@zellikinsurance.com', ['angela.turpin@gmail.com'])
const EILEEN = member('u-eileen', 'Eileen Jonah', 'ejonah@c21ne.com', ['eileen@jonahgroupre.com'])
const BRIAN = member('u-brian', 'Brian Theirrien', 'btheirrien@bgcl.org', ['brian.personal@gmail.com'])
const GREG = member('u-greg', 'Greg Row', 'rowgregory@gmail.com')
const OTHER = member('u-other', 'Pat Member', 'pat@somefirm.com', ['pat.home@gmail.com'])

const ids = (ms: { id: string }[]) => ms.map((m) => m.id)

test('the four people who have already reviewed are all on the list, and the three addresses already on record are intact', () => {
  assert.deepEqual(SQYSH_REVIEWED.map((e) => e.name), ['Kerry Casey', 'Angela Turpin', 'Eileen Jonah', 'Brian Theirrien'])
  const recorded = SQYSH_REVIEWED.flatMap((e) => e.emails).sort()
  assert.deepEqual(recorded, ['aturpin@zellikinsurance.com', 'btheirrien@bgcl.org', 'ejonah@c21ne.com', 'kcasey@ccm.com'])
  assert.ok(['kcasey@ccm.com', 'aturpin@zellikinsurance.com', 'ejonah@c21ne.com'].every((a) => recorded.includes(a)), 'the original three are untouched')
})

test('Kerry, Angela, Eileen and Brian are excluded by their addresses; everyone else stays eligible', () => {
  const { remaining, reviewed } = splitReviewed([KERRY, ANGELA, EILEEN, BRIAN, GREG, OTHER])
  assert.deepEqual(ids(reviewed.map((r) => r.member)), ['u-kerry', 'u-angela', 'u-eileen', 'u-brian'])
  assert.deepEqual(ids(remaining), ['u-greg', 'u-other'])
  assert.deepEqual(reviewed.map((r) => r.person), ['Kerry Casey', 'Angela Turpin', 'Eileen Jonah', 'Brian Theirrien'])
  assert.ok(reviewed.every((r) => r.via === 'listed-address'))
})

test('capitalisation and whitespace in the stored address cannot bypass the exclusion', () => {
  const variants = [member('a', 'K', ' KCasey@CCM.com '), member('b', 'A', 'ATurpin@ZellikInsurance.COM\n'), member('c', 'E', '\tejonah@C21NE.com'), member('d', 'K', 'Kerry <kcasey@ccm.com>'), member('e', 'B', ' BTheirrien@BGCL.org ')]
  assert.deepEqual(ids(splitReviewed(variants).reviewed.map((r) => r.member)), ['a', 'b', 'c', 'd', 'e'])
  assert.equal(addressKey('  KCasey@CCM.com '), 'kcasey@ccm.com')
})

test('an alternate address of a reviewed member is excluded: the whole member is, under every address', () => {
  // the member was signed in with their personal address as primary; the listed business address is an alternate
  const kerry2 = member('u-k2', 'Kerry Casey', 'kerry.casey.personal@gmail.com', ['kcasey@ccm.com'])
  const { remaining, reviewed } = splitReviewed([kerry2, GREG])
  assert.deepEqual(ids(reviewed.map((r) => r.member)), ['u-k2'])
  assert.equal(reviewed[0].via, 'alternate-of-reviewed-member')
  assert.deepEqual(ids(remaining), ['u-greg'])
})

test('the alternates of a reviewed member are excluded too: no reminder reaches them through another address', () => {
  // a second account that holds one of Kerry's other addresses as its own is excluded with her
  const stray = member('u-stray', 'K Casey', 'kerry.casey.personal@gmail.com')
  const { remaining, reviewed } = splitReviewed([KERRY, stray, GREG])
  assert.deepEqual(ids(reviewed.map((r) => r.member)).sort(), ['u-kerry', 'u-stray'])
  assert.equal(reviewed.find((r) => r.member.id === 'u-stray')?.via, 'address-shared-with-reviewed-member')
  assert.deepEqual(ids(remaining), ['u-greg'])
  // and an alternate of that stray account counts as well
  const stray2 = member('u-stray2', 'X', 'someone.else@gmail.com', ['KERRY.CASEY.PERSONAL@gmail.com '])
  assert.deepEqual(ids(splitReviewed([KERRY, stray2, GREG]).remaining), ['u-greg'])
})

test('similar names and look-alike addresses are not mistaken for a reviewed member', () => {
  const lookalikes = [
    member('n1', 'Kerry Casey', 'kerry.casey@othercompany.com'),
    member('n2', 'Kerry Casey-Smith', 'kcasey@ccm.com.au'),
    member('n3', 'Kerry Casey', 'kcasey@ccm.co'),
    member('n4', 'Angela Turpin', 'a.turpin@gmail.com'),
    member('n5', 'Eileen Jonah', 'eileen.jonah@gmail.com'),
    member('n6', 'Eileen J', 'ejonah@c21ne.org'),
    member('n7', 'Kcasey', 'xkcasey@ccm.com'),
    member('n8', 'Brian Theirrien', 'btheirrien@gmail.com'),
    member('n9', 'Brian Theirrien', 'btheirrien@bgcl.com'),
    member('n10', 'B Theirrien', 'btheirrien@mail.bgcl.org')
  ]
  const { remaining, reviewed } = splitReviewed(lookalikes)
  assert.equal(reviewed.length, 0, 'matching is by address and id, never by name')
  assert.equal(remaining.length, lookalikes.length)
})

test('Brian is excluded by his recorded address, and his alternate addresses go with him', () => {
  const { remaining, reviewed, unresolved } = splitReviewed([BRIAN, GREG])
  assert.deepEqual(ids(reviewed.map((r) => r.member)), ['u-brian'])
  assert.equal(reviewed[0].person, 'Brian Theirrien')
  assert.equal(reviewed[0].via, 'listed-address')
  assert.deepEqual(ids(remaining), ['u-greg'])
  assert.deepEqual(unresolved, [], 'every listed person now has an address on record')
})

test('Brian signed in with another address as primary: the listed address is his alternate, and he is still excluded', () => {
  const viaAlt = member('u-brian', 'Brian Theirrien', 'brian.personal@gmail.com', ['btheirrien@bgcl.org'])
  const { remaining, reviewed } = splitReviewed([viaAlt, GREG])
  assert.deepEqual(ids(reviewed.map((r) => r.member)), ['u-brian'])
  assert.equal(reviewed[0].via, 'alternate-of-reviewed-member')
  assert.deepEqual(ids(remaining), ['u-greg'])
})

test('every address of every reviewed member is excluded, whichever one the member query selected', () => {
  const accounts = [
    { who: KERRY, all: ['kcasey@ccm.com', 'kerry.casey.personal@gmail.com'] },
    { who: ANGELA, all: ['aturpin@zellikinsurance.com', 'angela.turpin@gmail.com'] },
    { who: EILEEN, all: ['ejonah@c21ne.com', 'eileen@jonahgroupre.com'] },
    { who: BRIAN, all: ['btheirrien@bgcl.org', 'brian.personal@gmail.com'] }
  ]
  for (const { who, all } of accounts)
    for (const primary of all) {
      // the same account, with each of its addresses taking a turn as the primary one
      const acct = member(who.id, who.name, primary, all.filter((a) => a !== primary))
      const { reviewed } = splitReviewed([acct, GREG])
      assert.deepEqual(ids(reviewed.map((r) => r.member)), [who.id], `${who.name} as ${primary}`)
    }
})

test('once a user id is added for someone, they are excluded by it, whatever address the account now has', () => {
  const withId = (userId: string): ReviewedMember[] => SQYSH_REVIEWED.map((e) => (e.name === 'Brian Theirrien' ? { ...e, userId } : e))
  const moved = member('u-brian', 'Brian Theirrien', 'newaddress@elsewhere.org')
  const r = splitReviewed([moved, GREG], withId('u-brian'))
  assert.deepEqual(ids(r.reviewed.map((x) => x.member)), ['u-brian'])
  assert.equal(r.reviewed[0].via, 'user-id')
  // a different member with the same name but another id and address is untouched
  assert.deepEqual(ids(splitReviewed([member('u-other-brian', 'Brian Theirrien', 'b.t@elsewhere.org')], withId('u-brian')).remaining), ['u-other-brian'])
})

test('a listed person with neither an address nor an id is reported as unresolved, and nothing is guessed', () => {
  const registry: ReviewedMember[] = [...SQYSH_REVIEWED, { name: 'Pat Nobody', emails: [] }]
  const { remaining, unresolved } = splitReviewed([member('p', 'Pat Nobody', 'pat.nobody@firm.com')], registry)
  assert.deepEqual(unresolved, ['Pat Nobody'])
  assert.deepEqual(ids(remaining), ['p'])
})

test('a listed person who is not in the roster is reported, and nothing else changes', () => {
  const { remaining, reviewed, notInRoster } = splitReviewed([GREG, OTHER])
  assert.equal(reviewed.length, 0)
  assert.deepEqual(ids(remaining), ['u-greg', 'u-other'])
  assert.deepEqual(notInRoster, ['Kerry Casey', 'Angela Turpin', 'Eileen Jonah', 'Brian Theirrien'])
})

test('the order of the roster does not matter, and the roster is not modified', () => {
  const roster = [GREG, KERRY, OTHER, ANGELA, BRIAN, EILEEN]
  const before = JSON.stringify(roster)
  const a = splitReviewed(roster)
  const b = splitReviewed([...roster].reverse())
  assert.deepEqual(ids(a.remaining).sort(), ids(b.remaining).sort())
  assert.deepEqual(ids(a.reviewed.map((r) => r.member)).sort(), ['u-angela', 'u-brian', 'u-eileen', 'u-kerry'])
  assert.equal(JSON.stringify(roster), before)
  assert.deepEqual(splitReviewed([]), { remaining: [], reviewed: [], notInRoster: ['Kerry Casey', 'Angela Turpin', 'Eileen Jonah', 'Brian Theirrien'], unresolved: [] })
})

test('duplicate addresses among the remaining members are mailed once; seeded and invalid ones are dropped', () => {
  const seeded = member('s1', 'Kerry Casey', 'kerry.casey@seed.coretest.local')
  const roster = [KERRY, seeded, GREG, member('g2', 'Greg Again', ' ROWGREGORY@gmail.com '), member('bad', 'Bad', 'not an address'), member('ex', 'Ex', 'x@example.com'), OTHER]
  const { remaining } = splitReviewed(roster)
  const plan = planCampaign('sqysh', remaining, { VERCEL_ENV: 'production' })
  assert.deepEqual(ids(plan.send), ['u-greg', 'u-other'])
  assert.deepEqual(plan.excluded.map((e) => [e.recipient.id, e.reason]), [['s1', 'seeded-test-address'], ['g2', 'duplicate'], ['bad', 'malformed'], ['ex', 'reserved-domain']])
})

console.log(`\n${passed} sqysh reviewed tests passed`)
