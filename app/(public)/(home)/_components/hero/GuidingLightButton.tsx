import { motion } from 'framer-motion'

export function GuidingLightButton({ handleInitiateGuidingLight, initiating, currentJudge }) {
  return (
    <button
      onClick={handleInitiateGuidingLight}
      disabled={initiating}
      aria-label="Initiate Guiding Light"
      className="group relative h-11 sm:h-12 px-6 sm:px-8 inline-flex items-center justify-center gap-2.5 overflow-hidden border border-cyan-300/50 disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-dark cursor-pointer flex-1"
      style={{
        background: 'radial-gradient(120% 160% at 50% 0%, #0e4a5c 0%, #062a38 55%, #021820 100%)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15), 0 2px 10px rgba(2,24,32,0.5)'
      }}
    >
      {/* Spinning lighthouse beam */}
      <span className="relative w-5 h-5 shrink-0 flex items-center justify-center">
        {/* Beam sweep */}
        <motion.span
          className="absolute inset-0 rounded-full pointer-events-none"
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          style={{
            background: 'conic-gradient(from 0deg, transparent 0deg, rgba(125,211,252,0.35) 30deg, transparent 60deg)'
          }}
        />
        {/* Lighthouse icon */}
        <svg width="14" height="18" viewBox="0 0 14 18" fill="none" className="relative z-10">
          {/* Light at top */}
          <rect x="4.5" y="0" width="5" height="3" rx="0.5" fill="#7dd3fc" />
          {/* Tower */}
          <path d="M5 3 L4 14 L10 14 L9 3 Z" fill="#bae6fd" fillOpacity="0.9" />
          {/* Base */}
          <rect x="3" y="14" width="8" height="2.5" rx="0.5" fill="#7dd3fc" />
          {/* Door */}
          <rect x="5.5" y="10" width="3" height="4" rx="0.5" fill="#0e4a5c" />
          {/* Windows */}
          <rect x="5.5" y="5" width="3" height="1.5" rx="0.3" fill="#0e4a5c" />
          <rect x="5.5" y="7.5" width="3" height="1.5" rx="0.3" fill="#0e4a5c" />
        </svg>
      </span>

      <span
        className="font-black text-xs sm:text-sm tracking-[0.08em] uppercase whitespace-nowrap"
        style={{
          background: 'linear-gradient(180deg, #e0f7ff 0%, #7dd3fc 40%, #38bdf8 70%, #0ea5e9 100%)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.4))'
        }}
      >
        {initiating ? 'Opening…' : `${currentJudge?.name}`}
      </span>
    </button>
  )
}
