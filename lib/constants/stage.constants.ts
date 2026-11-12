// Everything the TV ("the stage"), the host remote and the presenter remote
// share: the opening script, the command protocol, and the presentation types.

// ─── Script ───────────────────────────────────────────────────────────────────

export type Speaker =
  | 'HOST'
  | 'GUIDING_LIGHT'
  | 'EDUCATION'
  | 'CO_DIRECTOR'
  | 'TREASURER'
  | 'EVENT_COORDINATOR'
  | 'MEMBERSHIP'

export interface Segment {
  id: string
  speaker: Speaker
  title: string
  lines: string[]
  /** keep playing straight into the next section instead of pausing at this one's end */
  flow?: boolean
  handoff?: { to: Speaker; name: string; note?: string }
}

export interface ScriptNames {
  host: string
  guidingLight: string | null
  education: string | null
  presenter: string | null
  coDirectors: string | null
  treasurer: string | null
  eventCoordinator: string | null
  membership: string | null
}

export const SPEAKER_LABEL: Record<Speaker, string> = {
  HOST: 'Host',
  GUIDING_LIGHT: 'Guiding Light',
  EDUCATION: 'Education Coordinator',
  CO_DIRECTOR: 'Co-Directors',
  TREASURER: 'Treasurer',
  EVENT_COORDINATOR: 'Event Coordinator',
  MEMBERSHIP: 'Membership Committee'
}

export const DOORS_OPEN = '7:00'
export const MEETING_STARTS = '7:15'

export function buildScript({
  host,
  guidingLight,
  education,
  presenter,
  coDirectors,
  treasurer,
  eventCoordinator,
  membership
}: ScriptNames): Segment[] {
  const gl = guidingLight ?? 'this week’s Guiding Light'
  const edu = education ?? 'our Education Coordinator'
  const pres = presenter ?? 'this week’s presenter'
  const coDir = coDirectors ?? 'our Co-Directors'
  const treas = treasurer ?? 'our Treasurer'
  const evt = eventCoordinator ?? 'our Event Coordinator'
  const memb = membership ?? 'the Membership Committee'

  // Two sections are read word for word: the opening and the Guiding Light
  // instructions. Everything after is a cue card (title + who), and the host
  // says what she says.
  return [
    {
      id: 'welcome',
      speaker: 'HOST',
      title: 'Welcome',
      flow: true, // reads straight into the Guiding Light instructions
      lines: [
        'Good morning, and welcome to Coastal Referral Exchange.',
        'At this time, we ask that you please silence all your phones.',
        'CORE helps business owners grow through trusted, referral-based connections.',
        'We keep a supportive, high-energy room where members build relationships, pass referrals, and share what actually works.',
        'Four things we ask of every member: be on time, come to every meeting, pass referrals, and have one-to-ones with each other.'
      ]
    },
    {
      id: 'guiding-light',
      speaker: 'HOST',
      title: 'Guiding Light',
      lines: [
        `This week’s Guiding Light is ${gl}.`,
        `${gl}, you are picking next week’s Guiding Light.`,
        'Keep the app open on your phone and stay on the check-in screen. Do not lock it.',
        'When the 60 seconds begin, your shortlist will appear on its own.',
        'Tap the checkmark on a member to add them to your shortlist. Tap the checkmark again to take them off.',
        'And if you tap the trophy by accident, do not worry. You will get one more prompt to confirm before anyone is picked.'
      ],
      handoff: { to: 'GUIDING_LIGHT', name: gl, note: 'What CORE means to them.' }
    },
    {
      id: 'education',
      speaker: 'HOST',
      title: 'Education Moment',
      lines: [],
      handoff: { to: 'EDUCATION', name: edu, note: 'Thank the Guiding Light, then hand it over.' }
    },
    {
      id: 'sixty-seconds',
      speaker: 'HOST',
      title: '60 seconds',
      lines: [],
      handoff: { to: 'GUIDING_LIGHT', name: gl, note: 'Goes first, then the shortlist opens.' }
    },
    {
      id: 'co-directors',
      speaker: 'CO_DIRECTOR',
      title: 'Co-Directors',
      lines: [],
      handoff: { to: 'CO_DIRECTOR', name: coDir, note: 'Any updates for the room.' }
    },
    {
      id: 'event-coordinator',
      speaker: 'EVENT_COORDINATOR',
      title: 'Event Coordinator',
      lines: [],
      handoff: { to: 'EVENT_COORDINATOR', name: evt, note: 'Upcoming events and sign-ups.' }
    },
    {
      id: 'membership',
      speaker: 'MEMBERSHIP',
      title: 'Membership Committee',
      lines: [],
      handoff: { to: 'MEMBERSHIP', name: memb, note: 'Applications, renewals, and open seats.' }
    },
    {
      id: 'treasurer',
      speaker: 'TREASURER',
      title: 'Treasurer',
      lines: [
        `Next up is our Treasurer’s report. ${treas}, stand up right where you are and take it away.`,
        `${treas}, keep the treasurer screen open on your phone.`,
        `At the top, type our current bank balance into the box and tap save. It shows up on the TV right away.`,
        `Below that, add anything the chapter owes money on with its amount and a due date, and remove anything we have already paid.`,
        `Take your time getting it set. When you are ready, I will switch the TV to your board and you can walk us through the numbers.`
      ],
      handoff: {
        to: 'TREASURER',
        name: treas,
        note: 'Tap again to put the board on the TV. Card status, balance and obligations are there.'
      }
    },
    {
      id: 'presentation',
      speaker: 'HOST',
      title: 'Feature presentation',
      lines: [],
      handoff: { to: 'HOST', name: pres, note: 'Ten minutes.' }
    },
    { id: 'activity', speaker: 'HOST', title: 'Activity Round', lines: [] },
    { id: 'matchups', speaker: 'HOST', title: '1-2-1 matchups', lines: [] },
    {
      id: 'close',
      speaker: 'HOST',
      title: 'See you next Thursday',
      lines: [
        'That brings us to the end of this week’s meeting.',
        'Thank you all for being here, for the referrals you passed, and for showing up for one another.',
        'Get your one-to-ones on the calendar before you leave, and keep the momentum going all week.',
        'Have a great rest of your Thursday, and we will see you back here next week.'
      ]
    }
  ]
}

// ─── Presentations ───────────────────────────────────────────────────────────

export type PresentationKind = 'SLIDES' | 'VIDEO'

export interface StagePresentation {
  id: string
  kind: PresentationKind
  fileUrl: string
  fileName: string
  pageCount: number | null
  notes: string | null
  presenter: { id: string; name: string; company: string | null }
}

export const PRESENTATION_MINUTES = 10
export const MAX_UPLOAD_MB = { SLIDES: 40, VIDEO: 500 }

// ─── Commands: remotes → stage over Pusher ────────────────────────────────────

export const STAGE_CHANNEL = 'stage'
export const STAGE_EVENT = 'command'

export type StageCommand =
  // script; countdown shows a big 3-2-1 on the TV before the reading starts
  | { type: 'script.play'; countdown?: boolean }
  | { type: 'script.pause' }
  | { type: 'script.speed'; value: number }
  | { type: 'script.jump'; value: string; countdown?: boolean; play?: boolean }
  | { type: 'script.rewind' }
  // presentation
  | { type: 'present.start'; presentationId: string }
  | { type: 'present.page'; value: number } // 1-based
  | { type: 'present.video'; value: 'play' | 'pause' | 'restart' }
  | { type: 'present.end' }
  // presenter with nothing uploaded: their name and a clock on the TV while they talk
  | { type: 'presenter.spotlight'; name: string | null }
  // the Activity Round screen: 1-2-1s, referrals passed and TYFCB cycling on the TV
  | { type: 'activity.show' }
  // 1-2-1 pairs on the TV
  | { type: 'matchups.show' }
  // a poll's live results on the TV
  | { type: 'poll.show'; pollId: string }
  // take the poll off the TV and return to whatever screen it was covering
  | { type: 'poll.end' }
  // the treasurer board: card-on-file status + bank balance
  | { type: 'treasurer.show' }
  | { type: 'education.show' }
  // the sixty seconds screen: 3D carousel, then the judge's pick spins to the winner
  | { type: 'sixty.show' }
  | { type: 'guiding-light.show' }
  | { type: 'co-directors.show' }
  | { type: 'event-coordinator.show' }
  | { type: 'membership.show' }
  // the closing quote screen: philosopher quotes on rotation as the room wraps up
  | { type: 'closing.show' }
  // back to the check-in board
  | { type: 'holding' }

// Quotes that cycle on the closing screen once the host has read the closing words.
export const CLOSING_QUOTES: { text: string; who: string }[] = [
  { text: 'What is a friend? A single soul dwelling in two bodies.', who: 'Aristotle' },
  { text: 'The whole is greater than the sum of its parts.', who: 'Aristotle' },
  { text: 'The only way to have a friend is to be one.', who: 'Ralph Waldo Emerson' },
  { text: 'A journey of a thousand miles begins with a single step.', who: 'Lao Tzu' },
  { text: 'Our greatest glory is not in never falling, but in rising every time we fall.', who: 'Confucius' },
  { text: 'It does not matter how slowly you go as long as you do not stop.', who: 'Confucius' },
  { text: 'The happiness of your life depends upon the quality of your thoughts.', who: 'Marcus Aurelius' },
  { text: 'The unexamined life is not worth living.', who: 'Socrates' }
]

export interface MatchupMember {
  id: string
  name: string
  company: string
  profileImage: string | null
}

export interface Matchup {
  id: string
  requester: MatchupMember
  recipient: MatchupMember
}

export interface StagePerson {
  name: string
  company: string | null
  image: string | null
}

export interface StageMember {
  id: string
  name: string
  company: string | null
  profileImage: string | null
}

// ─── Treasurer board ──────────────────────────────────────────────────────────

export const TREASURY_CHANNEL = 'treasury'
export const TREASURY_EVENT = 'balance'

// Who can manage the treasury (set the balance, add/remove obligations) and see
// the treasurer page.
export const TREASURY_ROLES = new Set<string>(['SUPER_USER', 'TREASURER'])

// ─── Run of show: the host's remote walks these in order ─────────────────────

export type StepId =
  | 'open'
  | 'guiding-light'
  | 'education'
  | 'sixty'
  | 'co-directors'
  | 'event-coordinator'
  | 'membership'
  | 'treasurer'
  | 'presentation'
  | 'activity'
  | 'matchups'
  | 'close'

export interface Step {
  id: StepId
  title: string
  /** What the host should do or expect, in plain words, before tapping */
  help: (n: ScriptNames) => string
  /** sqyshvertex: ONE sentence telling the host what to do on this step */
  guide: (n: ScriptNames) => string
  /** Label on the one big button */
  button: string
}

export const RUN_OF_SHOW: Step[] = [
  {
    id: 'open',
    title: 'Open the meeting',
    help: () => 'The TV switches to the opening script. Read it down.',
    guide: () => 'Read the welcome down from the TV, line by line.',
    button: 'Start the script'
  },
  {
    id: 'guiding-light',
    title: 'Guiding Light',
    help: (n) =>
      `Puts ${n.guidingLight ?? 'the Guiding Light'} up on the TV as you read the intro. After the 60 seconds, tapping it again brings the winner back.`,
    guide: (n) => `Put ${n.guidingLight ?? 'the Guiding Light'} up on the TV as this week’s Guiding Light.`,
    button: 'Show the Guiding Light'
  },
  {
    id: 'education',
    title: 'Education moment',
    help: (n) =>
      `The script jumps to ${n.education ?? 'the Education Coordinator'}, who gives the education moment. Tap when they’re done.`,
    guide: (n) => `Hand it to ${n.education ?? 'the Education Coordinator'} for the education moment.`,
    button: 'Education moment'
  },
  {
    id: 'sixty',
    title: 'The 60 seconds',
    help: (n) =>
      `The shortlist opens on ${n.guidingLight ?? 'the Guiding Light'}’s phone and the Guiding Light screen goes up on the TV. The winner reveals when they pick.`,
    guide: (n) =>
      `Everyone gives their 60 seconds while ${n.guidingLight ?? 'the Guiding Light'} picks the winner from their phone.`,
    button: 'Start the 60 seconds'
  },
  {
    id: 'co-directors',
    title: 'Co-Directors',
    help: (n) => `After the reveal. The script jumps to ${n.coDirectors ?? 'the Co-Directors'} for any updates.`,
    guide: (n) => `Bring up ${n.coDirectors ?? 'the Co-Directors'} for their updates.`,
    button: 'Co-Directors'
  },
  {
    id: 'event-coordinator',
    title: 'Event Coordinator',
    help: (n) => `Puts ${n.eventCoordinator ?? 'the Event Coordinator'} on the TV for upcoming events and sign-ups.`,
    guide: (n) => `Hand it to ${n.eventCoordinator ?? 'the Event Coordinator'} for upcoming events.`,
    button: 'Event Coordinator'
  },
  {
    id: 'membership',
    title: 'Membership Committee',
    help: (n) => `Puts ${n.membership ?? 'the Membership Committee'} on the TV for membership updates.`,
    guide: (n) => `Hand it to ${n.membership ?? 'the Membership Committee'} for membership updates.`,
    button: 'Membership Committee'
  },
  {
    id: 'treasurer',
    title: 'Treasurer',
    help: (n) =>
      `The script introduces ${n.treasurer ?? 'the Treasurer'} and reminds them to open the treasurer screen on their phone. Tap again to put the board — card status, balance and obligations — on the TV for the report.`,
    guide: (n) => `Read the treasurer intro off the TV so ${n.treasurer ?? 'the Treasurer'} gets their phone ready.`,
    button: 'Introduce the Treasurer'
  },
  {
    id: 'presentation',
    title: 'Feature presentation',
    help: (n) => `${n.presenter ?? 'The presenter'} gets the clicker. The script comes back when they tap Done.`,
    guide: (n) => `Hand ${n.presenter ?? 'the presenter'} the clicker and let them run the deck.`,
    button: 'Start the presentation'
  },
  {
    id: 'activity',
    title: 'Activity Round',
    help: () => 'Puts the Activity Round screen on the TV while the room shares their numbers.',
    guide: () => 'Go around the room: 1-2-1s, referrals passed, and TYFCB.',
    button: 'Activity Round'
  },
  {
    id: 'matchups',
    title: '1-2-1 matchups',
    help: () => 'Kicks off the matchup reveal on the TV right away.',
    guide: () => 'Read this week’s pairs off the TV so everyone finds their partner.',
    button: 'Initiate matchups'
  },
  {
    id: 'close',
    title: 'Closing words',
    help: () => 'The script jumps to the closing words. Read them down.',
    guide: () => 'Read the closing words and send everyone off.',
    button: 'Closing words'
  }
]

export const SPEED_MIN = 20
export const SPEED_MAX = 140
export const SPEED_STEP = 10
export const SPEED_DEFAULT = 55

export const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark'

// ── Room dues: fixed quarterly schedule, computed (not stored) ──────────────
export const ROOM_DUES_ANCHOR = '2025-10-01' // last came out Oct 1
export const ROOM_DUES_INTERVAL_MONTHS = 3 // every 3 months
export const ROOM_DUES_AMOUNT = 60 // keep in sync with QUARTERLY_PRICE

export function nextRoomDuesDate(from: Date = new Date()): Date {
  const d = new Date(ROOM_DUES_ANCHOR + 'T00:00:00')
  while (d <= from) d.setMonth(d.getMonth() + ROOM_DUES_INTERVAL_MONTHS)
  return d
}

export interface TreasuryObligationItem {
  id: string
  label: string
  amount: number
  dueDate: string | null
}

export interface TreasurerBoard {
  balance: number | null
  updatedAt: string | null
  members: { id: string; name: string; hasCard: boolean }[]
  withCard: number
  total: number
  roomDue: { amount: number; dueDate: string }
  obligations: TreasuryObligationItem[]
}
