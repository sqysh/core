import { setOpenMembershipPaymentSetupModal } from '@/app/lib/redux/slices/appSlice'
import { store } from '@/app/lib/redux/store'
import { motion } from 'framer-motion'
import { CreditCard } from 'lucide-react'

export function NonActiveMembershipCard({ play, quarterlyDone, annualDone }) {
  return (
    <motion.button
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onClick={() => {
        play('se9')
        store.dispatch(setOpenMembershipPaymentSetupModal())
      }}
      className="w-full group relative flex items-center justify-between gap-3 px-4 py-3.5 border border-border-light dark:border-border-dark border-l-4 border-l-amber-500 dark:border-l-amber-400 bg-amber-50/50 dark:bg-amber-400/5 hover:bg-amber-50 dark:hover:bg-amber-400/10 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:focus-visible:ring-amber-400 overflow-hidden"
    >
      {/* Shine sweep */}
      <motion.div
        aria-hidden="true"
        initial={{ x: '-200%' }}
        animate={{ x: '500%' }}
        transition={{
          duration: 1.8,
          repeat: Infinity,
          repeatDelay: 3,
          ease: 'easeInOut'
        }}
        className="pointer-events-none absolute inset-y-0 left-0 w-1/3 skew-x-[-20deg] bg-linear-to-r from-transparent via-amber-300/40 to-transparent dark:via-amber-200/15"
      />

      <div className="relative flex items-center gap-3 min-w-0">
        <div className="shrink-0 w-8 h-8 border border-amber-500/40 dark:border-amber-400/40 bg-white dark:bg-bg-dark flex items-center justify-center">
          <CreditCard size={14} className="text-amber-600 dark:text-amber-400" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <motion.span
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="w-1.5 h-1.5 bg-amber-500 dark:bg-amber-400"
            />
            <span className="text-f10 font-mono tracking-[0.18em] uppercase text-amber-700 dark:text-amber-400 font-bold">
              Action Required
            </span>
          </div>
          <p className="font-sora font-bold text-[13.5px] text-text-light dark:text-text-dark leading-tight">
            Complete Membership Setup
          </p>
          <p className="text-f10 font-mono text-muted-light dark:text-muted-dark mt-0.5">
            {!quarterlyDone && !annualDone
              ? 'Add card · Annual admission and room dues'
              : !quarterlyDone
                ? `1 of 2 complete · Room dues remaining`
                : `1 of 2 complete · Annual admission remaining`}
          </p>
        </div>
      </div>
      <span className="relative shrink-0 px-3 py-2 bg-amber-500 dark:bg-amber-400 text-white dark:text-bg-dark text-f10 font-mono tracking-widest uppercase font-bold group-hover:bg-amber-600 dark:group-hover:bg-amber-300 transition-colors">
        Set Up
      </span>
    </motion.button>
  )
}
