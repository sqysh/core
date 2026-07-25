import { stagger } from '@/app/lib/constants/motion'
import { motion } from 'framer-motion'

export function Section({
  label,
  description,
  children
}: {
  label: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-1">
        <span className="block w-4 h-px bg-primary-light dark:bg-primary-dark shrink-0" aria-hidden="true" />
        <p className="text-f10 font-mono tracking-[0.2em] uppercase text-primary-light dark:text-primary-dark">
          {label}
        </p>
      </div>
      {description && (
        <p className="text-[11px] font-nunito text-muted-light dark:text-muted-dark ml-7 mb-3 leading-relaxed">
          {description}
        </p>
      )}
      {!description && <div className="mb-3" />}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={stagger}
        className="border border-border-light dark:border-border-dark"
      >
        {children}
      </motion.div>
    </div>
  )
}
