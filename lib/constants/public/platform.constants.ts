import {
  DirectoryVisual,
  LiveCheckInVisual,
  VisitorVisual,
  AdminDashboardVisual,
  BillingVisual,
  ClosedBusinessVisual,
  EventsVisual,
  FaceToFaceVisual,
  PresenterQueueVisual,
  ReferralsVisual
} from '@/app/(public)/platform/_components/visual-components'

export const PLATFORM_FEATURES = [
  {
    eyebrow: 'Live Check-In',
    title: 'Walk in, scan, light up the room',
    description:
      'A TV at the front of the room displays every active member in a grid. As members walk in Thursday morning, they scan a QR code with their phone — their photo instantly lights up on the screen with a sound effect, and attendance is recorded the moment it happens. No sign-in sheets, no roll call.',
    bullets: [
      'TV-formatted grid of all active members',
      'QR code scan checks you in instantly',
      'Real-time updates via Pusher — no refresh',
      'Sound effect + visual light-up confirms check-in',
      'Attendance recorded automatically'
    ],
    Visual: LiveCheckInVisual
  },
  {
    eyebrow: 'Member Directory',
    title: 'Every member, one tap away',
    description:
      'Searchable directory with photos, contact info, company, and industry. Members can pull up a fellow member at a coffee shop and make an intro on the spot.',
    bullets: [
      'Photo, company, and industry per member',
      'Phone and email linked directly',
      'Industry filters for finding the right person',
      'Exportable as a printable PDF directory'
    ],
    Visual: DirectoryVisual
  },
  {
    eyebrow: 'Visitor Management',
    title: 'Visitors invited, tracked, and welcomed',
    description:
      'Members add visitors directly from their dashboard. The platform sends a branded invitation with the meeting schedule, location, and what to expect — so guests walk in prepared.',
    bullets: [
      'Branded email invitations sent automatically',
      'Visitor day presenter info included in invites',
      'Visit dates linked to specific meetings',
      'Historical visitor records by chapter'
    ],
    Visual: VisitorVisual
  },
  {
    eyebrow: 'Referrals',
    title: 'Every referral, logged',
    description:
      'Members pass referrals through the platform — no scraps of paper, no lost contacts. Every referral has a clear sender, recipient, and status that updates as it progresses.',
    bullets: [
      'Referral source and recipient tracked',
      'Status updates as referrals progress',
      'Searchable history per member',
      'Recognized during weekly group round-up'
    ],
    Visual: ReferralsVisual
  },
  {
    eyebrow: 'Face-to-Face Meetings',
    title: 'The 1-on-1s that build the trust',
    description:
      'Members log each face-to-face meeting they hold with another member. These meetings are the foundation of how CORE works — and the platform makes them visible.',
    bullets: [
      'Log who you met with and when',
      'Per-member F2F counts and history',
      'Recognized at every weekly round-up',
      'Encourages consistent trust building'
    ],
    Visual: FaceToFaceVisual
  },
  {
    eyebrow: 'Closed Business',
    title: 'Closed business, celebrated publicly',
    description:
      'When a referral turns into actual revenue, the receiving member submits a thank-you naming the referrer and the dollar amount. The platform tallies the running total of business CORE has generated.',
    bullets: [
      'Dollar amounts attached to each thank-you',
      'Running totals per member and per chapter',
      'Public recognition during round-up',
      "Quantifiable proof of CORE's value"
    ],
    Visual: ClosedBusinessVisual
  },
  {
    eyebrow: 'Presenter Queue',
    title: 'A rotation that runs itself',
    description:
      "The platform manages the feature presentation queue — so every member gets their turn in the spotlight without leadership scrambling to figure out who's next.",
    bullets: [
      'Automatic rotation through all members',
      'Upcoming presenters visible to everyone',
      'Presenter name surfaced in visitor invites',
      'Schedule changes handled in seconds'
    ],
    Visual: PresenterQueueVisual
  },
  {
    eyebrow: 'Events',
    title: 'Meetings, mixers, and beyond',
    description:
      'Every chapter event lives in the platform — weekly meetings, visitor days, mixers, and external events members want to share with the group.',
    bullets: [
      'Upcoming and past events at a glance',
      'External event links from member groups',
      'Meeting schedule auto-populated each week',
      'Cancelled and rescheduled events tracked'
    ],
    Visual: EventsVisual
  },
  {
    eyebrow: 'Membership & Billing',
    title: 'Dues handled, no awkward conversations',
    description:
      'Annual and quarterly memberships are paid through the platform via Stripe. No checks, no chasing payments, no awkward conversations about who owes what.',
    bullets: [
      'Stripe-powered annual and quarterly subscriptions',
      'Saved payment methods for renewals',
      'Automatic dues reminders and receipts',
      'Membership status visible to leadership'
    ],
    Visual: BillingVisual
  },
  {
    eyebrow: 'Admin Dashboard',
    title: 'Leadership sees everything',
    description:
      'Chapter leadership has a full dashboard showing attendance trends, referral activity, closed business totals, visitor pipeline, and member engagement — all in one view.',
    bullets: [
      'At-a-glance chapter health metrics',
      'Member engagement and attendance trends',
      'Closed business and referral totals',
      'Visitor and event pipeline'
    ],
    Visual: AdminDashboardVisual
  }
]

export const WHY_IT_MATTERS_OPTS = [
  {
    num: '01',
    title: 'Visible',
    body: "Every member's attendance, referrals given, face-to-face meetings, and closed business are tracked. You see exactly what you're putting in — and getting out."
  },
  {
    num: '02',
    title: 'Permanent',
    body: 'Nothing slips through the cracks. A referral passed in 2024 is still in the system. A thank-you given last month is part of the running total.'
  },
  {
    num: '03',
    title: 'Effortless',
    body: 'Members check in with a QR scan, add visitors from their phone, and log referrals in seconds. The platform handles invitations, reminders, and receipts.'
  }
]
