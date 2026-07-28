'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'

export default function FadeUp({
  children,
  delay = 0,
  duration = 0.45,
  y = 16,
  margin = '-32px',
  ease = [0.25, 0.46, 0.45, 0.94] as number[],
  className = ''
}: {
  children: React.ReactNode
  delay?: number
  duration?: number
  y?: number
  margin?: string | any
  ease?: number[] | string | any
  className?: string
}) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration, delay, ease }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
