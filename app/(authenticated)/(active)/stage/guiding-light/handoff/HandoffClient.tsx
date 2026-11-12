'use client'

import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'

export default function HandoffClient({ winnerName }: { winnerName: string }) {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-bg-light dark:bg-bg-dark flex flex-col items-center justify-center px-6 text-center gap-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 18 }}
        className="flex flex-col items-center gap-5"
      >
        {/* Trophy */}
        <motion.p
          animate={{ rotate: [0, -12, 12, -8, 8, 0] }}
          transition={{ delay: 0.4, duration: 0.7 }}
          className="text-6xl"
        >
          🏆
        </motion.p>

        {/* Label */}
        <div>
          <p className="font-mono text-[9.5px] tracking-[0.25em] uppercase text-primary-light dark:text-primary-dark mb-2">
            This Week's Guiding Light
          </p>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="font-sora font-black text-[32px] text-text-light dark:text-text-dark leading-none tracking-tight"
          >
            {winnerName}
          </motion.p>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <span className="block w-10 h-px bg-primary-light/30 dark:bg-primary-dark/30" />
          <p className="font-mono text-[9px] tracking-[0.2em] uppercase text-muted-light dark:text-muted-dark">
            Hand them the trophy
          </p>
          <span className="block w-10 h-px bg-primary-light/30 dark:bg-primary-dark/30" />
        </div>

        {/* Message */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="font-nunito text-[15px] text-muted-light dark:text-muted-dark max-w-xs leading-relaxed"
        >
          Great pick. Next week {winnerName.split(' ')[0]} will judge the 60 seconds and select the next Guiding Light.
        </motion.p>
      </motion.div>

      {/* Done button */}
      <motion.button
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        onClick={() => router.push('/dashboard')}
        className="h-11 px-8 border border-border-light dark:border-border-dark text-muted-light dark:text-muted-dark font-mono text-[10px] tracking-[0.15em] uppercase hover:border-primary-light dark:hover:border-primary-dark hover:text-primary-light dark:hover:text-primary-dark transition-colors"
      >
        Done
      </motion.button>
    </div>
  )
}
