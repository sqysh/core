import { AnimatePresence, motion } from 'framer-motion'

export function SqyshSlime({ tipSqysh }: { tipSqysh: boolean }) {
  return (
    <AnimatePresence>
      {tipSqysh && (
        <motion.div
          key="slime"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.2 } }}
          aria-hidden="true"
          className="absolute left-0 right-0 top-0 z-20 pointer-events-none overflow-visible"
        >
          <svg
            viewBox="0 0 400 60"
            preserveAspectRatio="none"
            className="w-full h-15 block"
            style={{ filter: 'drop-shadow(0 2px 4px rgba(245, 158, 11, 0.3))' }}
          >
            <defs>
              <linearGradient id="slime-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#d97706" />
              </linearGradient>
            </defs>

            {/* Main slime mass that hangs from the top */}
            <motion.path
              initial={{ d: 'M0,0 L400,0 L400,0 Q200,0 0,0 Z' }}
              animate={{
                d: [
                  'M0,0 L400,0 L400,0 Q200,0 0,0 Z',
                  'M0,0 L400,0 L400,8 Q300,18 200,14 Q100,18 0,8 Z',
                  'M0,0 L400,0 L400,6 Q300,14 200,10 Q100,14 0,6 Z'
                ]
              }}
              transition={{ duration: 0.6, times: [0, 0.7, 1], ease: 'easeOut' }}
              fill="url(#slime-gradient)"
            />

            {/* Drip 1 — left */}
            <motion.path
              initial={{ d: 'M85,8 Q88,8 91,8 Q88,8 85,8 Z' }}
              animate={{
                d: ['M85,8 Q88,8 91,8 Q88,8 85,8 Z', 'M83,8 Q88,22 93,8 Q88,8 83,8 Z', 'M84,8 Q88,18 92,8 Q88,8 84,8 Z']
              }}
              transition={{ duration: 0.7, delay: 0.15, times: [0, 0.7, 1], ease: [0.34, 1.56, 0.64, 1] }}
              fill="url(#slime-gradient)"
            />

            {/* Drip 2 — center, longer */}
            <motion.path
              initial={{ d: 'M195,10 Q200,10 205,10 Q200,10 195,10 Z' }}
              animate={{
                d: [
                  'M195,10 Q200,10 205,10 Q200,10 195,10 Z',
                  'M192,10 Q200,40 208,10 Q200,10 192,10 Z',
                  'M194,10 Q200,32 206,10 Q200,10 194,10 Z'
                ]
              }}
              transition={{ duration: 0.85, delay: 0.2, times: [0, 0.7, 1], ease: [0.34, 1.56, 0.64, 1] }}
              fill="url(#slime-gradient)"
            />

            {/* Drip 3 — right */}
            <motion.path
              initial={{ d: 'M305,8 Q310,8 315,8 Q310,8 305,8 Z' }}
              animate={{
                d: [
                  'M305,8 Q310,8 315,8 Q310,8 305,8 Z',
                  'M302,8 Q310,28 318,8 Q310,8 302,8 Z',
                  'M303,8 Q310,22 317,8 Q310,8 303,8 Z'
                ]
              }}
              transition={{ duration: 0.75, delay: 0.1, times: [0, 0.7, 1], ease: [0.34, 1.56, 0.64, 1] }}
              fill="url(#slime-gradient)"
            />

            {/* Tiny drop falling from center drip */}
            <motion.circle
              initial={{ cx: 200, cy: 32, r: 0, opacity: 0 }}
              animate={{
                cy: [32, 55, 60],
                r: [0, 3, 0],
                opacity: [0, 1, 0]
              }}
              transition={{ duration: 0.8, delay: 0.6, times: [0, 0.4, 1] }}
              fill="url(#slime-gradient)"
            />
          </svg>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
