import { getInitials } from '@/lib/utils/shared.utils'
import { AnimatePresence, motion } from 'framer-motion'

export default function SpotlightModal({ spotlightMember, setSpotlightMember }) {
  return (
    <AnimatePresence>
      {spotlightMember && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 backdrop-blur-sm"
            style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
            onClick={() => setSpotlightMember(null)}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 24 }}
            transition={{ type: 'spring', stiffness: 280, damping: 24 }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          >
            <div className="pointer-events-auto w-80 border border-primary-dark/30 bg-bg-dark overflow-hidden">
              {/* Top accent */}
              <div className="h-1 bg-primary-dark w-full" />

              {/* Profile image */}
              <div className="relative w-full aspect-square overflow-hidden">
                {spotlightMember.profileImage ? (
                  <img
                    src={spotlightMember.profileImage}
                    alt={spotlightMember.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-primary-dark/10 flex items-center justify-center">
                    <span className="font-sora font-black text-7xl text-primary-dark">
                      {getInitials(spotlightMember.name)}
                    </span>
                  </div>
                )}
                {/* Gradient overlay at bottom */}
                <div className="absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-bg-dark to-transparent" />
              </div>

              {/* Info */}
              <div className="px-5 py-4 -mt-8 relative z-10">
                <p className="font-mono text-[9px] tracking-[0.2em] uppercase text-primary-dark mb-1">
                  Coastal Referral Exchange
                </p>
                <h2 className="font-sora font-black text-[26px] text-text-dark leading-none tracking-tight">
                  {spotlightMember.name}
                </h2>
                <p className="font-sora font-semibold text-[15px] text-primary-dark mt-1">{spotlightMember.company}</p>
                {spotlightMember.title && (
                  <p className="font-nunito text-[13px] text-muted-dark mt-0.5">{spotlightMember.title}</p>
                )}
                {spotlightMember.weeklyTreasureWishlist && (
                  <div className="mt-3 px-3 py-2.5 border border-primary-dark/20 bg-primary-dark/5">
                    <p className="font-mono text-[8px] tracking-[0.18em] uppercase text-primary-dark mb-1">
                      Looking for this week
                    </p>
                    <p className="font-nunito text-[13px] text-text-dark leading-snug">
                      {spotlightMember.weeklyTreasureWishlist}
                    </p>
                  </div>
                )}
              </div>

              {/* Close */}
              <div className="px-5 pb-5">
                <button
                  onClick={() => setSpotlightMember(null)}
                  className="w-full h-9 border border-border-dark text-muted-dark font-mono text-[9px] tracking-[0.15em] uppercase hover:border-primary-dark hover:text-primary-dark transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
