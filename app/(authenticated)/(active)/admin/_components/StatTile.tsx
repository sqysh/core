import { useInView, motion } from 'framer-motion'
import { useRef } from 'react'

export function StatTile({
  value,
  label,
  icon: Icon,
  delay
}: {
  value: string | number
  label: string
  icon: React.ElementType
  delay: number
}) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-16px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 12 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.4, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="flex flex-col gap-1 px-3 py-3 border-r border-b border-border-light dark:border-border-dark nth-[3n]:border-r-0"
    >
      <Icon size={13} className="text-primary-light dark:text-primary-dark" aria-hidden="true" />
      <p className="font-sora font-black text-[18px] xs:text-xl text-primary-light dark:text-primary-dark tabular-nums leading-none">
        {value}
      </p>
      <p className="text-f9 font-mono tracking-[0.12em] uppercase text-muted-light dark:text-muted-dark">{label}</p>
    </motion.div>
  )
}
