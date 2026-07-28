import Picture from '@/components/_shared/Picture'
import { getInitials } from '@/lib/utils/shared.utils'
import { Member } from '@/types/attendance.types'
import { AnimatePresence, motion } from 'framer-motion'
import { Check } from 'lucide-react'

export function NameTile({
  member,
  checkedIn,
  checkedInTime,
  justCheckedIn
}: {
  member: Member
  checkedIn: boolean
  checkedInTime: string | null
  justCheckedIn: boolean
}) {
  const firstName = member.name.split(' ')[0]
  const lastName = member.name.split(' ').slice(1).join(' ')

  return (
    <motion.div
      layout
      animate={justCheckedIn ? { scale: [1, 1.05, 0.98, 1] } : { scale: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden h-full w-full"
    >
      {/* Photo / video / initials */}
      {member.profileVideo ? (
        <video
          src={member.profileVideo}
          autoPlay
          loop
          muted
          playsInline
          className={`object-cover w-full h-full transition-all duration-700 ${
            checkedIn ? 'brightness-100 saturate-100' : 'brightness-[0.15] saturate-0'
          }`}
        />
      ) : member.profileImage ? (
        <Picture
          src={member.profileImage}
          alt={member.name}
          priority
          className={`object-cover transition-all duration-700 w-full h-full ${
            checkedIn ? 'brightness-100 saturate-100' : 'brightness-[0.15] saturate-0'
          }`}
        />
      ) : (
        <div
          className={`absolute inset-0 flex items-center justify-center transition-all duration-700 ${
            checkedIn ? 'bg-bg-dark' : 'bg-bg-dark/30'
          }`}
        >
          <span
            className={`font-sora font-black transition-all duration-700 ${checkedIn ? 'text-white' : 'text-white/10'}`}
            style={{ fontSize: 'clamp(2rem, 5vw, 4rem)' }}
          >
            {getInitials(member.name)}
          </span>
        </div>
      )}

      {/* Dark gradient overlay */}
      <div
        className={`absolute inset-0 bg-linear-to-t from-black/90 via-black/10 to-transparent transition-opacity duration-700 ${
          checkedIn ? 'opacity-100' : 'opacity-40'
        }`}
      />

      {/* Shimmer sweep */}
      <AnimatePresence>
        {justCheckedIn && (
          <motion.div
            key="shimmer"
            initial={{ x: '-100%', opacity: 0.9 }}
            animate={{ x: '200%', opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
            className="absolute inset-0 z-20 pointer-events-none"
            style={{
              background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.6) 50%, transparent 70%)'
            }}
          />
        )}
      </AnimatePresence>

      {/* Flash */}
      <AnimatePresence>
        {justCheckedIn && (
          <motion.div
            key="flash"
            initial={{ opacity: 0.4 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
            className="absolute inset-0 bg-white/30 pointer-events-none z-10"
          />
        )}
      </AnimatePresence>

      {/* Ripple */}
      <AnimatePresence>
        {justCheckedIn && (
          <motion.div
            key="ripple"
            initial={{ scale: 0, opacity: 0.6 }}
            animate={{ scale: 4, opacity: 0 }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="absolute inset-0 m-auto w-10 h-10 rounded-full bg-white/40 pointer-events-none z-10"
          />
        )}
      </AnimatePresence>

      {/* ── Checkmark badge — top right ── */}
      <div className="absolute top-2 right-2 z-30">
        <AnimatePresence>
          {checkedIn && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center shadow-lg"
            >
              <Check size={14} className="text-white" strokeWidth={3} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Lower third */}
      <div className="absolute bottom-0 left-0 right-0 px-2 pb-2 pt-6 z-30">
        <p
          className={`font-sora font-black leading-none transition-all duration-700 ${
            checkedIn ? 'text-white' : 'text-white/20'
          }`}
          style={{ fontSize: 'clamp(0.9rem, 1.8vw, 1.5rem)' }}
        >
          {firstName}
        </p>
        <p
          className={`font-sora font-bold leading-none mt-0.5 transition-all duration-700 ${
            checkedIn ? 'text-white/80' : 'text-white/10'
          }`}
          style={{ fontSize: 'clamp(0.7rem, 1.3vw, 1.1rem)' }}
        >
          {lastName}
        </p>

        {/* Check-in time */}
        <AnimatePresence>
          {checkedIn && checkedInTime && (
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="text-[10px] font-mono tracking-widest uppercase text-green-400/80 mt-1"
            >
              {checkedInTime}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
