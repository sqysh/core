import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { SqyshMode, SqyshVector } from '@/components/_shared/SqyshVector'

// Sqysh pops up from behind the Pay bar when the tip is ticked: squash-stretch
// landing with an excited tentacle fling, then settles into his idle.

const SOFT = [0.22, 1, 0.36, 1] as const

function Sqysh({ reduce }: { reduce: boolean }) {
  const [mode, setMode] = useState<SqyshMode>(reduce ? 'idle' : 'excited')

  useEffect(() => {
    if (reduce) return
    const id = setTimeout(() => setMode('idle'), 1500)
    return () => clearTimeout(id)
  }, [reduce])

  return <SqyshVector mode={mode} reduce={reduce} id="sq-skin-modal" />
}

export function SqyshSlime({ tipSqysh }: { tipSqysh: boolean }) {
  const reduce = !!useReducedMotion()

  return (
    <AnimatePresence initial={false}>
      {tipSqysh && (
        <div
          aria-hidden="true"
          // Sits on the top edge of the Pay bar; the bar is opaque and above him, so he rises from behind it
          className="pointer-events-none absolute right-4 z-5 flex items-end gap-2.5 bottom-[calc(65px+max(1.5rem,env(safe-area-inset-bottom)))] sm:right-5"
        >
          <motion.p
            key="bubble"
            initial={reduce ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            transition={{ duration: reduce ? 0 : 0.3, delay: reduce ? 0 : 0.6, ease: SOFT }}
            className="mb-7 origin-bottom-right border border-border-light bg-bg-light px-3 py-2 font-mono text-[12px] text-text-light shadow-sm dark:border-border-dark dark:bg-bg-dark dark:text-text-dark sm:mb-9"
          >
            <span className="text-[#bf66ef]">&gt;</span> thank you.
          </motion.p>

          <motion.div
            key="sqysh"
            initial={
              reduce ? { y: 0, scaleX: 1, scaleY: 1, opacity: 1 } : { y: 90, scaleX: 1.2, scaleY: 0.65, opacity: 0 }
            }
            // Up stretched, splat wide on landing, overshoot tall, settle. Origin is the floor.
            animate={{
              y: [90, -18, 0, 0, 0],
              scaleX: [1.2, 0.9, 1.18, 0.96, 1],
              scaleY: [0.65, 1.15, 0.68, 1.07, 1],
              opacity: [0, 1, 1, 1, 1]
            }}
            exit={{ y: 90, opacity: 0, transition: { duration: 0.25, ease: 'easeIn' } }}
            transition={{ duration: reduce ? 0 : 0.78, times: [0, 0.42, 0.58, 0.8, 1], ease: 'easeOut' }}
            className="h-22 origin-bottom drop-shadow-[0_8px_18px_rgba(124,66,224,0.4)] sm:h-26"
          >
            <Sqysh reduce={reduce} />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
