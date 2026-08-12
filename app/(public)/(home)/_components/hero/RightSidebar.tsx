import { motion } from 'framer-motion'

export function RightSidebar() {
  return (
    <div className="absolute right-6 sm:right-10 top-1/2 -translate-y-1/2 z-20 hidden lg:flex flex-col items-center gap-6">
      <div className="flex flex-col items-center gap-2">
        <p className="text-[9px] font-mono tracking-[0.3em] uppercase text-white/40 rotate-90 mb-4">Scroll</p>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          className="w-px h-12 bg-linear-to-b from-white/40 to-transparent"
        />
      </div>

      <div className="w-px h-8 bg-white/20" />

      <a
        href="https://facebook.com/coastalreferralexchange"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Facebook"
        className="text-white/40 hover:text-white/80 transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
        </svg>
      </a>
    </div>
  )
}
