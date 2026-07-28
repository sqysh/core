import { ActivityItem } from '@/types/dashboard.types'
import { ActivityIcon, DollarSign, Users } from 'lucide-react'

export const ACTIONS = [
  {
    key: 'f2f' as const,
    icon: Users,
    tag: '01 · Meeting',
    tagShort: 'Meeting',
    label: 'Face-2-Face',
    desc: 'Log a 1-on-1 with a member',
    accentHex: '#38bdf8',
    tagColor: '#0284c7',
    submitLabel: 'Log Meeting',
    colors: {
      bg: 'bg-sky-50 dark:bg-sky-400/8',
      border: 'border-sky-200 dark:border-sky-400/20',
      hover: 'hover:bg-sky-100 dark:hover:bg-sky-400/15',
      tag: 'text-sky-500 dark:text-[#38bdf8]',
      title: 'text-sky-900 dark:text-text-dark',
      desc: 'text-sky-600 dark:text-sky-400'
    }
  },
  {
    key: 'referral' as const,
    icon: ActivityIcon,
    tag: '02 · Referral',
    tagShort: 'Referral',
    label: 'Give a Referral',
    desc: 'Pass business to a member',
    accentHex: '#22d3ee',
    tagColor: '#0891b2',
    submitLabel: 'Send Referral',
    colors: {
      bg: 'bg-cyan-50 dark:bg-cyan-400/8',
      border: 'border-cyan-200 dark:border-cyan-400/20',
      hover: 'hover:bg-cyan-100 dark:hover:bg-cyan-400/15',
      tag: 'text-cyan-500 dark:text-[#22d3ee]',
      title: 'text-cyan-900 dark:text-text-dark',
      desc: 'text-cyan-600 dark:text-cyan-400'
    }
  },
  {
    key: 'closed' as const,
    icon: DollarSign,
    tag: '03 · Thank You',
    tagShort: 'Thank You',
    label: 'Closed Business',
    desc: 'Thank a member for a closed deal',
    accentHex: '#34d399',
    tagColor: '#059669',
    submitLabel: 'Submit',
    colors: {
      bg: 'bg-emerald-50 dark:bg-emerald-400/8',
      border: 'border-emerald-200 dark:border-emerald-400/20',
      hover: 'hover:bg-emerald-100 dark:hover:bg-emerald-400/15',
      tag: 'text-emerald-500 dark:text-[#34d399]',
      title: 'text-emerald-900 dark:text-text-dark',
      desc: 'text-emerald-600 dark:text-emerald-400'
    }
  }
] as const

export const ACCENT = {
  meeting: '#38bdf8', // sky-400
  referral: '#22d3ee', // cyan-400
  closed: '#34d399' // emerald-400
} as const

export const TABS = [
  { key: 'ALL', label: 'All' },
  { key: 'MEETING', label: 'Meetings' },
  { key: 'REFERRAL', label: 'Referrals' },
  { key: 'CLOSED', label: 'Closed' }
] as const

export const DOT_COLOR: Record<ActivityItem['type'], string> = {
  MEETING: ACCENT.meeting,
  REFERRAL: ACCENT.referral,
  CLOSED: ACCENT.closed
}

export const inputCls =
  'w-full h-12 bg-white dark:bg-bg-dark border border-slate-300 dark:border-border-dark px-3.5 font-nunito text-[15px] text-text-light dark:text-text-dark placeholder:text-slate-400 dark:placeholder:text-muted-dark/50 focus:outline-none focus:border-primary-light dark:focus:border-primary-dark focus:ring-1 focus:ring-primary-light/20 dark:focus:ring-primary-dark/20 transition-colors rounded-none'
