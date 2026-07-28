// CORE-themed phrase bank. UPPERCASE; only A–Z are guessable (spaces always
// shown). Add member names / inside jokes here.

export interface Phrase {
  text: string
  hint: string
}

export const PHRASES: Phrase[] = [
  { text: 'THURSDAY SEVEN AM', hint: 'When we meet' },
  { text: 'COASTAL REFERRAL EXCHANGE', hint: "You're in it" },
  { text: 'WHO DO YOU KNOW', hint: 'The magic question' },
  { text: 'NORTH SHORE', hint: 'Our turf' },
  { text: 'PASS THE REFERRAL', hint: 'The whole point' },
  { text: 'BOOK THE ONE TO ONE', hint: 'Your homework' },
  { text: 'GIVERS GAIN', hint: 'The mindset' },
  { text: 'KNOW LIKE TRUST', hint: 'How referrals happen' },
  { text: 'BRING A VISITOR', hint: 'Grow the room' },
  { text: 'WEEKLY PRESENTATION', hint: 'Your sixty seconds' }
]

export function pickPhrase(excludeText?: string): Phrase {
  const pool = excludeText ? PHRASES.filter((p) => p.text !== excludeText) : PHRASES
  const list = pool.length ? pool : PHRASES
  return list[Math.floor(Math.random() * list.length)]
}
