import { getInitials } from '@/lib/utils/shared.utils'
import { AnimatePresence, motion } from 'framer-motion'

export default function NewJudgeModal({ newJudge }) {
  return (
    <AnimatePresence>
      {newJudge && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="flex flex-col items-center gap-5 text-center"
          >
            {/* Avatar */}
            <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-cyan-400 shadow-[0_0_40px_rgba(34,211,238,0.5)]">
              {newJudge.profileImage ? (
                <img src={newJudge.profileImage} alt={newJudge.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-cyan-400/10 flex items-center justify-center">
                  <span className="font-sora font-black text-4xl text-cyan-400">{getInitials(newJudge.name)}</span>
                </div>
              )}
            </div>

            <div>
              <p className="font-mono text-[10px] tracking-[0.25em] uppercase text-cyan-400 mb-2">New Judge</p>
              <p className="font-sora font-black text-[48px] text-white leading-none tracking-tight">{newJudge.name}</p>
              <p className="font-sora font-semibold text-[18px] text-white/50 mt-2">{newJudge.company}</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
