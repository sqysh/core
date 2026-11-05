import type { SqyshUpdate } from '@/app/(authenticated)/(active)/check-in/CheckInClient'

// What Sqysh shows on the check-in screen this week. Rewrite before each
// Thursday; leave it empty and he skips the tour.
export const SQYSH_UPDATES: SqyshUpdate[] = [
  {
    title: 'Reinstate a missed Thursday from check-in',
    detail: 'Your three most recent misses are right under the ring. One tap, card on file, done.'
  },
  {
    title: 'Leadership, every season',
    detail: 'New Leadership page with this year’s team and every past season, plus a card on the dashboard.'
  },
  {
    title: 'Dashboard jump nav',
    detail: 'Sticky section links at the top, bigger tap targets and larger type throughout.'
  },
  {
    title: 'Guiding Light results by email',
    detail: 'Every Thursday afternoon the winner and next judge go out to the whole group automatically.'
  },
  {
    title: 'Billing moved to the top',
    detail: 'Once your membership is set up the big card goes away and a Billing link sits next to Profile.'
  }
]
