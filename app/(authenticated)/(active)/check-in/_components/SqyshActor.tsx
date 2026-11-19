import { motion } from 'framer-motion'
import { SqyshVector } from '@/components/_shared/SqyshVector'
import { jumpPath } from '../_lib/motion'
import type { Corner, Spot, SqyshMode } from '../_lib/types'

interface SqyshActorProps {
  sq: { w: number; h: number }
  spot: Spot
  corner: Corner | null
  mode: SqyshMode
  reduce: boolean
}

export function SqyshActor({ sq, spot, corner, mode, reduce }: SqyshActorProps) {
  const parked = { x: 0, y: -sq.h * 0.58, scale: 0.4 }

  const animate =
    spot === 'below'
      ? { x: 0, y: sq.h * 0.37, scale: 0.55, opacity: 0 }
      : spot === 'centre'
        ? { x: 0, y: 0, scale: 1, opacity: 1 }
        : spot === 'hover'
          ? { x: 0, y: -sq.h * 0.58 - 36, scale: 0.55, rotate: 0, opacity: 1 }
          : spot === 'park' || !corner
            ? { ...parked, rotate: 0, opacity: 1 }
            : { ...jumpPath(parked, corner), opacity: 1 }

  const transition =
    spot === 'centre'
      ? { duration: 0.85, ease: [0.34, 1.4, 0.64, 1] as const }
      : spot === 'park'
        ? { duration: 0.85, ease: [0.65, 0, 0.35, 1] as const }
        : spot === 'corner'
          ? { duration: 1.1, ease: 'linear' as const }
          : spot === 'hover'
            ? { type: 'spring' as const, stiffness: 220, damping: 14 }
            : { duration: 0 }

  return (
    <motion.div
      className="pointer-events-none absolute left-1/2 top-1/2 z-2"
      style={{ width: sq.w, height: sq.h, marginLeft: -sq.w / 2, marginTop: -sq.h / 2 }}
      initial={{ x: 0, y: sq.h * 0.37, scale: 0.55, opacity: 0 }}
      animate={animate}
      transition={transition}
    >
      <motion.div
        animate={mode === 'excited' ? { y: [0, -sq.h * 0.14, 0] } : { y: 0 }}
        transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
      >
        <div className="animate-[ciBob_3.4s_ease-in-out_1s_infinite] drop-shadow-[0_0_26px_rgba(168,85,247,0.45)]">
          <SqyshVector
            mode={mode}
            reduce={reduce}
            className="block h-auto w-full overflow-visible"
            id="sq-skin-checkin"
          />
        </div>
      </motion.div>
    </motion.div>
  )
}
