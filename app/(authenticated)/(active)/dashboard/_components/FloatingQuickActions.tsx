'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Users, Activity, DollarSign } from 'lucide-react'
import { useState } from 'react'

const ACTIONS = [
  {
    key: 'f2f',
    tag: 'Meeting',
    label: '1-2-1',
    icon: Users,
    color: 'text-cyan-400',
    bg: 'bg-cyan-400/10',
    hover: 'hover:bg-cyan-400/20 active:bg-cyan-400/25',
    border: 'border-r border-cyan-400/20'
  },
  {
    key: 'referral',
    tag: 'Referral',
    label: 'Give a Referral',
    icon: Activity,
    color: 'text-cyan-300',
    bg: 'bg-cyan-300/10',
    hover: 'hover:bg-cyan-300/20 active:bg-cyan-300/25',
    border: 'border-r border-cyan-300/20'
  },
  {
    key: 'closed',
    tag: 'Thank You',
    label: 'Closed Business',
    icon: DollarSign,
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10',
    hover: 'hover:bg-emerald-400/20 active:bg-emerald-400/25',
    border: ''
  }
]

export default function FloatingQuickActions({ onAction }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none max-w-170 mx-auto">
      <div
        className="pointer-events-auto flex items-stretch w-full overflow-hidden border border-border-light dark:border-primary-dark/30 bg-white/90 dark:bg-bg-dark/90"
        style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
      >
        {ACTIONS.map((action, i) => {
          const Icon = action.icon
          return (
            <button
              key={action.key}
              onClick={() => onAction(action.key)}
              className={`flex flex-col items-center justify-center gap-1 flex-1 py-2.5 px-2 transition-colors focus-visible:outline-none ${action.bg} ${action.hover} ${action.border}`}
            >
              <Icon size={14} className={`${action.color} shrink-0`} aria-hidden="true" />
              <span
                className={`font-mono text-[7px] tracking-[0.18em] uppercase leading-none ${action.color} opacity-70`}
              >
                {action.tag}
              </span>
              <span className="font-sora font-bold text-[10px] text-text-light dark:text-text-dark leading-none text-center">
                {action.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
