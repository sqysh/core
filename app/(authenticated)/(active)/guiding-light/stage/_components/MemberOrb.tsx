import { getInitials } from '@/lib/utils/shared.utils'
import { motion } from 'framer-motion'

export default function MemberOrb({ member, phase, setSpotlightMember, index, radius, activeIndex, members, winner }) {
  const angle = (index * Math.PI * 2) / members.length - Math.PI / 2
  const x = Math.cos(angle) * radius
  const y = Math.sin(angle) * radius
  const isActive = activeIndex === index
  const isWinner = phase === 'revealed' && winner?.id === member.id
  return (
    <div
      key={member.id}
      onClick={() => phase === 'idle' && setSpotlightMember(member)}
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: `translate(calc(${x}px - 50%), calc(${y}px - 50%))`
      }}
    >
      <motion.div
        animate={{
          scale: isActive ? 1.15 : 1
        }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className="flex flex-col items-center gap-1.5"
      >
        {/* Photo */}
        <div
          style={{
            width: isWinner ? '9vmin' : isActive ? '10vmin' : '9vmin',
            height: isWinner ? '9vmin' : isActive ? '10vmin' : '9vmin',
            borderRadius: '50%',
            overflow: 'hidden',
            border: isWinner
              ? '2px solid #fbbf24'
              : isActive
                ? '2px solid var(--color-primary-dark)'
                : '2px solid rgba(255,255,255,0.1)',
            boxShadow: isWinner
              ? '0 0 30px rgba(251,191,36,0.7)'
              : isActive
                ? '0 0 40px 6px rgba(56,189,248,0.8)'
                : 'none',
            transition: 'all 0.15s ease',
            flexShrink: 0
          }}
        >
          {member.profileImage ? (
            <img
              src={member.profileImage}
              alt={member.name}
              className={`w-full h-full object-cover transition-all duration-150 ${
                isActive || isWinner ? 'brightness-100 saturate-100' : 'brightness-[0.3] saturate-0'
              }`}
            />
          ) : (
            <div
              className={`w-full h-full flex items-center justify-center transition-all duration-150 ${
                isActive || isWinner ? 'bg-primary-dark/20' : 'bg-white/5'
              }`}
            >
              <span
                className={`font-sora font-black text-[11px] transition-all duration-150 ${
                  isActive || isWinner ? 'text-white' : 'text-white/20'
                }`}
              >
                {getInitials(member.name)}
              </span>
            </div>
          )}
        </div>

        <p
          className={`font-sora font-bold text-center leading-none whitespace-nowrap transition-all duration-150 ${
            isWinner ? 'text-[13px] text-amber-400' : isActive ? 'text-[11px] text-white' : 'text-[10px] text-white/30'
          }`}
        >
          {member.name.split(' ')[0]}
        </p>
      </motion.div>
    </div>
  )
}
