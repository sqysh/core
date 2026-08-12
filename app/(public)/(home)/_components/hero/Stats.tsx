import { Fragment } from 'react/jsx-runtime'
import { motion } from 'framer-motion'

export function Stats() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.65 }}
      className="flex items-center gap-4 xs:gap-6 sm:gap-12 pointer-events-none"
    >
      {[
        { value: '14', label: 'Active Members' },
        { value: '1', label: 'Seat Per Industry' },
        { value: '7AM', label: 'Every Thursday' }
      ].map(({ value, label }, i) => (
        <Fragment key={i}>
          <div className="min-w-0">
            <p className="font-sora font-black text-xl xs:text-2xl sm:text-3xl text-white leading-none drop-shadow">
              {value}
            </p>
            <p className="text-[8px] xs:text-[9px] sm:text-f10 font-mono tracking-[0.15em] sm:tracking-widest uppercase text-white sm:text-white/50 mt-1 leading-tight">
              {label}
            </p>
          </div>
          {i < 2 && <span key={`sep-${i}`} className="w-px h-7 sm:h-8 bg-white/20 shrink-0" aria-hidden="true" />}
        </Fragment>
      ))}
    </motion.div>
  )
}
