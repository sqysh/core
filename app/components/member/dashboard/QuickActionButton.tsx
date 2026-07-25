import { ACTIONS } from '@/app/lib/constants/member/dashboard.constants'
import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

export function QuickActionButton({ action, onClick }: { action: (typeof ACTIONS)[number]; onClick: () => void }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-32px' })
  const { icon: Icon, colors, tagShort, label, desc } = action

  return (
    <motion.button
      ref={ref}
      initial={{ opacity: 0 }}
      animate={inView ? { opacity: 1 } : {}}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      onClick={onClick}
      style={{ WebkitTapHighlightColor: 'transparent' }}
      className={`w-full text-left flex items-center gap-4 px-5 py-5 ${colors.bg} ${colors.border} border ${colors.hover} active:scale-[0.985] transition-[transform,background-color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark focus-visible:ring-offset-2`}
      aria-label={`Open ${label} form`}
    >
      <Icon size={22} className={`${colors.tag} shrink-0`} strokeWidth={1.75} aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <p className={`text-f10 font-mono tracking-[0.2em] uppercase mb-1 ${colors.tag}`}>{tagShort}</p>
        <p className={`font-sora font-bold text-[17px] leading-tight tracking-tight mb-0.5 ${colors.title}`}>{label}</p>
        <p className={`text-[12.5px] font-nunito ${colors.desc}`}>{desc}</p>
      </div>
    </motion.button>
  )
}
