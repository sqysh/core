import { motion } from 'framer-motion'

export interface FloatingEmoji {
  id: string
  emoji: string
  x: number
}

export function FloatingEmojiEl({ emoji, x, onDone }: { emoji: string; x: number; onDone: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 1, y: 0, scale: 0.8, x: 0 }}
      animate={{
        opacity: [1, 1, 1, 0],
        y: typeof window !== 'undefined' ? -window.innerHeight : -900,
        scale: [0.8, 1.4, 1.2, 1],
        x: [0, 30, -25, 20, -15, 0]
      }}
      transition={{
        duration: 5,
        ease: 'easeOut',
        x: { duration: 5, ease: 'easeInOut', times: [0, 0.25, 0.5, 0.75, 0.9, 1] },
        opacity: { duration: 5, times: [0, 0.6, 0.8, 1] }
      }}
      onAnimationComplete={onDone}
      className="fixed bottom-32 z-50 pointer-events-none select-none text-4xl"
      style={{ left: `${x}%` }}
    >
      {emoji}
    </motion.div>
  )
}
