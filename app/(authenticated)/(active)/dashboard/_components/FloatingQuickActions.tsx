'use client'

import { motion } from 'framer-motion'
import { Users, Activity, DollarSign } from 'lucide-react'

const ACTIONS = [
  { key: 'f2f', tag: 'Meeting', label: '1-2-1', icon: Users },
  { key: 'referral', tag: 'Referral', label: 'Give a Referral', icon: Activity },
  { key: 'closed', tag: 'Thank You', label: 'Closed Business', icon: DollarSign }
] as const

export default function FloatingQuickActions({ onAction }: { onAction: (key: string) => void }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none pb-[max(1rem,env(safe-area-inset-bottom))] px-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.3 }}
        className="pointer-events-auto relative mx-auto w-full max-w-162 rounded-[28px] overflow-hidden border border-white/40 dark:border-white/10 bg-white/55 dark:bg-white/[0.07] shadow-[0_8px_32px_-4px_rgba(0,0,0,0.18),0_2px_8px_-2px_rgba(0,0,0,0.12),inset_0_1px_0_0_rgba(255,255,255,0.7)] dark:shadow-[0_8px_32px_-4px_rgba(0,0,0,0.5),inset_0_1px_0_0_rgba(255,255,255,0.12)]"
        style={{
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)'
        }}
      >
        {/* Specular highlight across the top edge */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/35 to-transparent dark:from-white/10"
        />

        <div className="relative flex items-stretch divide-x divide-white/30 dark:divide-white/10">
          {ACTIONS.map(({ key, tag, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => onAction(key)}
              className="group flex-1 flex flex-col items-center justify-center gap-1.5 h-[72px] px-2 transition-colors hover:bg-white/30 dark:hover:bg-white/10 active:bg-white/45 dark:active:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark first:rounded-l-[28px] last:rounded-r-[28px]"
            >
              <Icon
                size={20}
                className="text-primary-light dark:text-primary-dark shrink-0 transition-transform group-active:scale-90"
                aria-hidden="true"
              />
              <span className="font-sora font-bold text-[13px] text-text-light dark:text-text-dark leading-tight text-center">
                {label}
              </span>
              <span className="sr-only">{tag}</span>
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
