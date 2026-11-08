import { getInitials } from '@/lib/utils/shared.utils'
import { Member } from '@/types/attendance.types'
import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { useEffect, useState } from 'react'

export function CheckInAnnouncement({ member, onDone }: { member: Member; onDone: () => void }) {
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setLeaving(true), 2000)
    return () => clearTimeout(t)
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: leaving ? 0 : 1 }}
      transition={{ duration: leaving ? 0.6 : 0.3 }}
      onAnimationComplete={() => {
        if (leaving) onDone()
      }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ backgroundColor: leaving ? 'rgba(0,0,0,0)' : 'rgba(0,0,0,0.85)' }}
    >
      <motion.div
        animate={{ scale: leaving ? 0.6 : 1, opacity: leaving ? 0 : 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center"
      >
        {/* Photo */}
        <motion.div
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: leaving ? 0.4 : 1, opacity: leaving ? 0 : 1 }}
          transition={{ duration: leaving ? 0.5 : 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-64 h-64 rounded-full overflow-hidden border-4 border-green-400 mb-8 relative"
        >
          {member.profileVideo ? (
            <video src={member.profileVideo} autoPlay loop muted playsInline className="w-full h-full object-cover" />
          ) : member.profileImage ? (
            <img src={member.profileImage} alt={member.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-bg-dark flex items-center justify-center">
              <span className="font-sora font-black text-white text-6xl">{getInitials(member.name)}</span>
            </div>
          )}
          <motion.div
            initial={{ scale: 1, opacity: 0.6 }}
            animate={{ scale: 1.4, opacity: 0 }}
            transition={{ duration: 1, repeat: 2, ease: 'easeOut' }}
            className="absolute inset-0 rounded-full border-4 border-green-400 pointer-events-none"
          />
        </motion.div>

        {/* Name */}
        <p className="font-mono text-[11px] tracking-[0.3em] uppercase text-green-400 mb-2">Just checked in</p>
        <p
          className="font-sora font-black text-white leading-none text-center"
          style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)' }}
        >
          {member.name}
        </p>
        {member.company && <p className="font-sora font-semibold text-white/50 mt-2 text-2xl">{member.company}</p>}

        {/* Check badge */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: leaving ? 0 : 1 }}
          transition={{ delay: leaving ? 0 : 0.3, type: 'spring', stiffness: 300, damping: 20 }}
          className="mt-8 w-16 h-16 rounded-full bg-green-500 flex items-center justify-center"
        >
          <Check size={32} className="text-white" strokeWidth={3} />
        </motion.div>
      </motion.div>
    </motion.div>
  )
}
