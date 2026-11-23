import { normalizeAddress } from './delivery'

// Members who have already left Sqysh a Google review: the Sqysh review reminder never goes to them.
//
// A person is excluded, not just one address of theirs. Each entry lists the addresses we have on record; at run time
// the members query (with their alternate sign-in addresses) is checked against them:
//
//   1. Any member whose primary or alternate address, or whose id, is listed is that person.
//   2. Every address of that member (primary and all alternates) is then excluded too, so the reminder can't reach
//      them through another address.
//   3. Anyone else holding one of those addresses is excluded with them.
//
// Names are labels for people reading this file. They are never matched: two members with similar names are not the
// same person, and an address is only ever attributed to someone because it is on record here or on their own account.
//
// To add someone who has just reviewed: add an entry with an address of theirs (or their user id), then deploy.

export type ReviewedMember = {
  /** For people reading this list; never used to match */
  name: string
  /** Addresses on record for this person (any case or spacing; normalized when compared) */
  emails: string[]
  /** The member's user id, once known: the most stable way to identify them */
  userId?: string
}

export const SQYSH_REVIEWED: ReviewedMember[] = [
  { name: 'Kerry Casey', emails: ['kcasey@ccm.com'] },
  { name: 'Angela Turpin', emails: ['aturpin@zellikinsurance.com'] },
  { name: 'Eileen Jonah', emails: ['ejonah@c21ne.com'] },
  { name: 'Brian Theirrien', emails: ['btheirrien@bgcl.org'] }
]

export type Reviewable = { id: string; email: string; alternateEmails?: { email: string }[] | null }

/** How an address is compared: normalized when it parses, trimmed and lower-cased when it doesn't, so odd stored text can't slip by */
export const addressKey = (raw: unknown) =>
  normalizeAddress(raw) ??
  String(raw ?? '')
    .trim()
    .toLowerCase()

const addressesOf = (m: Reviewable) =>
  [m.email, ...(m.alternateEmails ?? []).map((e) => e.email)].map(addressKey).filter(Boolean)

export type ReviewedMatch<M> = {
  member: M
  /** Who on the list this member is */
  person: string
  /** How they were recognised */
  via: 'user-id' | 'listed-address' | 'alternate-of-reviewed-member' | 'address-shared-with-reviewed-member'
}

export type ReviewedSplit<M> = {
  /** Members the reminder may go to */
  remaining: M[]
  /** Members it must not go to, and why */
  reviewed: ReviewedMatch<M>[]
  /** Listed people nobody in the roster matched (not an active member, or an address on record that isn't theirs) */
  notInRoster: string[]
  /** Listed people with neither an address nor an id: they cannot be excluded until one is added */
  unresolved: string[]
}

export function splitReviewed<M extends Reviewable>(
  members: M[],
  registry: ReviewedMember[] = SQYSH_REVIEWED
): ReviewedSplit<M> {
  const byAddress = new Map<string, string>()
  const byId = new Map<string, string>()
  const unresolved: string[] = []
  for (const entry of registry) {
    const emails = entry.emails.map(addressKey).filter(Boolean)
    if (!emails.length && !entry.userId) unresolved.push(entry.name)
    for (const e of emails) byAddress.set(e, entry.name)
    if (entry.userId) byId.set(entry.userId, entry.name)
  }

  // 1. who is on the list (by id, or any address they hold), and every address those people hold
  const matched = new Map<M, ReviewedMatch<M>>()
  const reviewedAddresses = new Map<string, string>()
  const people = new Set<string>()
  for (const member of members) {
    const addresses = addressesOf(member)
    const byIdName = byId.get(member.id)
    const listed = addresses.find((a) => byAddress.has(a))
    const person = byIdName ?? (listed ? byAddress.get(listed) : undefined)
    if (!person) continue
    matched.set(member, {
      member,
      person,
      via: byIdName
        ? 'user-id'
        : addressKey(member.email) === listed
          ? 'listed-address'
          : 'alternate-of-reviewed-member'
    })
    people.add(person)
    for (const a of addresses) reviewedAddresses.set(a, person)
  }

  // 2. anyone else who holds one of those addresses
  for (const member of members) {
    if (matched.has(member)) continue
    const shared = addressesOf(member).find((a) => reviewedAddresses.has(a))
    if (shared)
      matched.set(member, {
        member,
        person: reviewedAddresses.get(shared) as string,
        via: 'address-shared-with-reviewed-member'
      })
  }

  return {
    remaining: members.filter((m) => !matched.has(m)),
    reviewed: members.filter((m) => matched.has(m)).map((m) => matched.get(m) as ReviewedMatch<M>),
    notInRoster: registry.filter((e) => !people.has(e.name) && !unresolved.includes(e.name)).map((e) => e.name),
    unresolved
  }
}
