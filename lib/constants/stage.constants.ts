// Everything the TV ("the stage"), the host remote and the presenter remote
// share: the opening script, the command protocol, and the presentation types.

// ─── Script ───────────────────────────────────────────────────────────────────

export type Speaker = 'HOST' | 'GUIDING_LIGHT' | 'EDUCATION'

export interface Segment {
  id: string
  speaker: Speaker
  title: string
  lines: string[]
  handoff?: { to: Speaker; name: string; note?: string }
}

export interface ScriptNames {
  host: string
  guidingLight: string | null
  education: string | null
  presenter: string | null
}

export const SPEAKER_LABEL: Record<Speaker, string> = {
  HOST: 'Host',
  GUIDING_LIGHT: 'Guiding Light',
  EDUCATION: 'Education Coordinator'
}

export const DOORS_OPEN = '7:00'
export const MEETING_STARTS = '7:15'

export function buildScript({ host, guidingLight, education, presenter }: ScriptNames): Segment[] {
  const gl = guidingLight ?? 'this week\u2019s Guiding Light'
  const edu = education ?? 'our Education Coordinator'
  const pres = presenter ?? 'this week\u2019s presenter'

  // Two sections are read word for word: the opening and the Guiding Light
  // instructions. Everything after is a cue card (title + who), and the host
  // says what she says.
  return [
    {
      id: 'welcome',
      speaker: 'HOST',
      title: 'Welcome',
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
        `This week\u2019s Guiding Light is ${gl}.`,
        `${gl}, you are picking next week\u2019s Guiding Light.`,
        'Keep the app open on your phone and stay on the check-in screen. Do not lock it.',
        'When the 60 seconds begin, your shortlist will appear on its own. Tap a member after they speak to add them.'
      ],
      handoff: {
        to: 'GUIDING_LIGHT',
        name: gl,
        note: 'What CORE means to them.'
      }
    },
    {
      id: 'education',
      speaker: 'HOST',
      title: 'Education Moment',
      lines: [],
      handoff: {
        to: 'EDUCATION',
        name: edu,
        note: 'Thank the Guiding Light, then hand it over.'
      }
    },
    {
      id: 'sixty-seconds',
      speaker: 'HOST',
      title: '60 seconds',
      lines: [],
      handoff: {
        to: 'GUIDING_LIGHT',
        name: gl,
        note: 'Goes first, then the shortlist opens.'
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
    { id: 'close', speaker: 'HOST', title: 'See you next Thursday', lines: [] }
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
  // script
  | { type: 'script.play' }
  | { type: 'script.pause' }
  | { type: 'script.speed'; value: number }
  | { type: 'script.jump'; value: string }
  // presentation
  | { type: 'present.start'; presentationId: string }
  | { type: 'present.page'; value: number } // 1-based
  | { type: 'present.video'; value: 'play' | 'pause' | 'restart' }
  | { type: 'present.end' }
  // 1-2-1 pairs on the TV
  | { type: 'matchups.show' }
  // a poll's live results on the TV
  | { type: 'poll.show'; pollId: string }
  // back to the check-in board
  | { type: 'holding' }

export interface Matchup {
  a: { id: string; name: string; company: string | null }
  b: { id: string; name: string; company: string | null }
}

// ─── Run of show: the host's remote walks these in order ─────────────────────

export type StepId = 'open' | 'shortlist' | 'presentation' | 'activity' | 'matchups' | 'close'

export interface Step {
  id: StepId
  title: string
  /** What the host should do or expect, in plain words, before tapping */
  help: (n: ScriptNames) => string
  /** Label on the one big button */
  button: string
}

export const RUN_OF_SHOW: Step[] = [
  {
    id: 'open',
    title: 'Open the meeting',
    help: () => 'TV switches to the script.',
    button: 'Start the script'
  },
  {
    id: 'shortlist',
    title: 'Guiding Light',
    help: (n) =>
      `After ${n.guidingLight ?? 'the Guiding Light'}\u2019s 60 seconds. Their phone switches to the shortlist.`,
    button: 'Open the shortlist'
  },
  {
    id: 'presentation',
    title: 'Feature presentation',
    help: (n) => `${n.presenter ?? 'The presenter'} gets the clicker. The script comes back when they tap Done.`,
    button: 'Start the presentation'
  },
  {
    id: 'activity',
    title: 'Activity Round',
    help: () => 'Cue card on the TV.',
    button: 'Activity Round'
  },
  {
    id: 'matchups',
    title: '1-2-1 matchups',
    help: () => 'Puts the pairs on the TV.',
    button: 'Show matchups'
  },
  {
    id: 'close',
    title: 'Close',
    help: () => 'Back to the check-in board.',
    button: 'End the meeting'
  }
]

export const SPEED_MIN = 20
export const SPEED_MAX = 140
export const SPEED_STEP = 10
export const SPEED_DEFAULT = 55

export const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark'
