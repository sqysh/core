/* ============================================================
   VISUAL COMPONENTS — one per feature
   All use design tokens; work in light + dark automatically.
   ============================================================ */

import { useEffect, useRef, useState } from 'react'
import { animate, motion, useInView, useMotionValue, useTransform } from 'framer-motion'

// 1. Live Check-In: grid of avatars lighting up in sequence
export function LiveCheckInVisual() {
  const [lit, setLit] = useState<Set<number>>(new Set())
  const cells = Array.from({ length: 16 })

  useEffect(() => {
    let i = 0
    const order = [3, 7, 1, 10, 5, 14, 2, 11, 6, 0, 9, 13, 4, 8, 15, 12]
    const interval = setInterval(() => {
      setLit((prev) => {
        if (prev.size >= 16) return new Set()
        const next = new Set(prev)
        next.add(order[i % 16])
        return next
      })
      i++
    }, 350)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="grid grid-cols-4 gap-2 p-4">
      {cells.map((_, i) => {
        const isLit = lit.has(i)
        return (
          <motion.div
            key={i}
            animate={{
              scale: isLit ? [1, 1.08, 1] : 1,
              opacity: isLit ? 1 : 0.25
            }}
            transition={{ duration: 0.4 }}
            className={`aspect-square border ${
              isLit
                ? 'border-primary-light dark:border-primary-dark bg-primary-light/10 dark:bg-primary-dark/15'
                : 'border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark'
            } flex items-center justify-center`}
          >
            <div
              className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full ${
                isLit ? 'bg-primary-light dark:bg-primary-dark' : 'bg-muted-light/30 dark:bg-muted-dark/30'
              }`}
            />
          </motion.div>
        )
      })}
    </div>
  )
}

// 2. Member Directory: network graph with pulsing nodes
export function DirectoryVisual() {
  const nodes = [
    { x: 50, y: 30, r: 6 },
    { x: 20, y: 60, r: 5 },
    { x: 80, y: 50, r: 5 },
    { x: 35, y: 90, r: 5 },
    { x: 70, y: 100, r: 4 },
    { x: 50, y: 70, r: 8 }, // center / highlighted
    { x: 90, y: 90, r: 4 },
    { x: 15, y: 100, r: 4 },
    { x: 55, y: 130, r: 5 }
  ]
  const center = nodes[5]

  return (
    <div className="w-full h-full flex items-center justify-center p-6">
      <svg viewBox="0 0 100 160" className="w-full h-full max-w-md">
        {nodes.map((n, i) => {
          if (i === 5) return null
          return (
            <motion.line
              key={`line-${i}`}
              x1={center.x}
              y1={center.y}
              x2={n.x}
              y2={n.y}
              className="stroke-border-light dark:stroke-border-dark"
              strokeWidth="0.3"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.5, delay: i * 0.1, repeat: Infinity, repeatType: 'reverse', repeatDelay: 2 }}
            />
          )
        })}
        {nodes.map((n, i) => (
          <motion.circle
            key={`node-${i}`}
            cx={n.x}
            cy={n.y}
            r={n.r}
            className={
              i === 5 ? 'fill-primary-light dark:fill-primary-dark' : 'fill-muted-light/40 dark:fill-muted-dark/40'
            }
            animate={
              i === 5
                ? {
                    scale: [1, 1.2, 1]
                  }
                : {}
            }
            style={{ transformOrigin: `${n.x}px ${n.y}px` }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}
      </svg>
    </div>
  )
}

// 3. Visitor Management: email envelope with auto-send animation
export function VisitorVisual() {
  return (
    <div className="w-full h-full flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-sm space-y-2 sm:space-y-3">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              duration: 0.5,
              delay: i * 0.8,
              repeat: Infinity,
              repeatType: 'loop',
              repeatDelay: 2.5 - i * 0.8
            }}
            className="border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark p-2 sm:p-3 flex items-center gap-2 sm:gap-3"
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 border border-primary-light dark:border-primary-dark flex items-center justify-center shrink-0">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-primary-light dark:stroke-primary-dark"
                strokeWidth="2"
              >
                <path d="M3 8l9 6 9-6M3 8v10a2 2 0 002 2h14a2 2 0 002-2V8M3 8l2-2h14l2 2" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] sm:text-f10 font-mono tracking-[0.12em] sm:tracking-[0.15em] uppercase text-muted-light dark:text-muted-dark truncate">
                Invite Sent
              </p>
              <p className="text-[11px] sm:text-xs font-nunito text-text-light dark:text-text-dark truncate">
                {['Jane Smith', 'Marcus Lee', 'Anna Roy'][i]} · Thursday meeting
              </p>
            </div>
            <span className="text-[9px] sm:text-f10 font-mono text-primary-light dark:text-primary-dark shrink-0">
              ✓
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// 4. Referrals: flow diagram with status cycling
export function ReferralsVisual() {
  const statuses = ['Pending', 'In Progress', 'Closed']
  const [statusIdx, setStatusIdx] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setStatusIdx((s) => (s + 1) % 3), 1800)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="w-full h-full flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md flex items-center gap-2 sm:gap-3">
        {/* Sender */}
        <div className="flex-1 border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark p-2 sm:p-3 text-center">
          <div className="w-7 h-7 sm:w-8 sm:h-8 mx-auto rounded-full bg-muted-light/30 dark:bg-muted-dark/30 mb-1.5 sm:mb-2" />
          <p className="text-[9px] sm:text-f10 font-mono tracking-[0.12em] sm:tracking-[0.15em] uppercase text-muted-light dark:text-muted-dark">
            Member A
          </p>
        </div>

        {/* Arrow + referral card */}
        <div className="flex flex-col items-center gap-1 shrink-0">
          <motion.div
            animate={{ x: [0, 4, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            className="text-primary-light dark:text-primary-dark font-mono text-[10px] sm:text-xs"
          >
            →
          </motion.div>
          <motion.div
            key={statusIdx}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="border border-primary-light dark:border-primary-dark bg-primary-light/5 dark:bg-primary-dark/10 px-1.5 sm:px-2 py-1"
          >
            <p className="text-[8px] sm:text-[9px] font-mono tracking-widest sm:tracking-[0.15em] uppercase text-primary-light dark:text-primary-dark whitespace-nowrap">
              {statuses[statusIdx]}
            </p>
          </motion.div>
          <motion.div
            animate={{ x: [0, 4, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
            className="text-primary-light dark:text-primary-dark font-mono text-[10px] sm:text-xs"
          >
            →
          </motion.div>
        </div>

        {/* Recipient */}
        <div className="flex-1 border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark p-2 sm:p-3 text-center">
          <div className="w-7 h-7 sm:w-8 sm:h-8 mx-auto rounded-full bg-muted-light/30 dark:bg-muted-dark/30 mb-1.5 sm:mb-2" />
          <p className="text-[9px] sm:text-f10 font-mono tracking-[0.12em] sm:tracking-[0.15em] uppercase text-muted-light dark:text-muted-dark">
            Member B
          </p>
        </div>
      </div>
    </div>
  )
}

// 5. Face-to-Face: calendar grid filling in + mini leaderboard
export function FaceToFaceVisual() {
  const cells = Array.from({ length: 28 })
  const filled = [0, 3, 7, 8, 12, 14, 15, 19, 21, 24, 25, 27]
  const leaders = [
    { name: 'Brendan K.', count: 14 },
    { name: 'Page T.', count: 11 },
    { name: 'Greg M.', count: 9 }
  ]

  return (
    <div className="w-full h-full flex items-center justify-center p-4 sm:p-6 gap-3 sm:gap-6">
      <div className="grid grid-cols-7 gap-1 w-32 sm:w-44 shrink-0">
        {cells.map((_, i) => {
          const isFilled = filled.includes(i)
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: isFilled ? 1 : 0.25 }}
              transition={{
                delay: i * 0.05,
                repeat: Infinity,
                repeatType: 'reverse',
                repeatDelay: 4,
                duration: 0.4
              }}
              className={`aspect-square ${
                isFilled ? 'bg-primary-light dark:bg-primary-dark' : 'bg-muted-light/15 dark:bg-muted-dark/15'
              }`}
            />
          )
        })}
      </div>
      <div className="flex-1 min-w-0 max-w-40 space-y-1.5 sm:space-y-2">
        {leaders.map((l, i) => (
          <motion.div
            key={l.name}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.15 }}
            className="border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark p-1.5 sm:p-2 flex items-center justify-between gap-2"
          >
            <p className="text-[10px] font-nunito text-text-light dark:text-text-dark truncate">{l.name}</p>
            <p className="text-[9px] sm:text-f10 font-mono font-bold text-primary-light dark:text-primary-dark shrink-0">
              {l.count}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// 6. Closed Business: animated counter
export function ClosedBusinessVisual() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: false, margin: '-100px' })
  const count = useMotionValue(0)
  const display = useTransform(count, (val) => `$${Math.floor(val).toLocaleString()}`)

  useEffect(() => {
    if (inView) {
      const controls = animate(count, 847320, { duration: 2.5, ease: 'easeOut' })
      return () => controls.stop()
    } else {
      count.set(0)
    }
  }, [inView, count])

  const recent = [
    { from: 'Page T.', to: 'Brendan K.', amount: '$12,400' },
    { from: 'Greg M.', to: 'Anna R.', amount: '$3,800' },
    { from: 'Luis P.', to: 'Greg M.', amount: '$8,250' }
  ]

  return (
    <div ref={ref} className="w-full h-full flex flex-col items-center justify-center p-6">
      <p className="text-f10 font-mono tracking-[0.2em] uppercase text-muted-light dark:text-muted-dark mb-2">
        Closed Business · YTD
      </p>
      <motion.p className="font-sora font-black text-4xl sm:text-5xl text-primary-light dark:text-primary-dark mb-6">
        {display}
      </motion.p>
      <div className="w-full max-w-sm space-y-1.5">
        {recent.map((r, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.5 + i * 0.2 }}
            className="flex items-center justify-between text-[10px] font-mono tracking-widest uppercase border-b border-border-light dark:border-border-dark py-1.5"
          >
            <span className="text-muted-light dark:text-muted-dark truncate">
              {r.from} → {r.to}
            </span>
            <span className="text-text-light dark:text-text-dark font-bold shrink-0">{r.amount}</span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// 7. Presenter Queue: horizontal timeline with cursor sliding
export function PresenterQueueVisual() {
  const presenters = ['BK', 'PT', 'GM', 'AR', 'LP', 'JD']
  const [activeIdx, setActiveIdx] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setActiveIdx((i) => (i + 1) % presenters.length), 1500)
    return () => clearInterval(id)
  }, [presenters.length])

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-6 gap-4">
      <div className="w-full max-w-md relative">
        <div className="h-px bg-border-light dark:bg-border-dark absolute top-1/2 left-0 right-0" />
        <div className="flex justify-between relative">
          {presenters.map((p, i) => (
            <motion.div
              key={p}
              animate={{
                scale: i === activeIdx ? 1.15 : 1
              }}
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border-2 ${
                i === activeIdx
                  ? 'bg-primary-light dark:bg-primary-dark border-primary-light dark:border-primary-dark text-bg-light dark:text-bg-dark'
                  : 'bg-bg-light dark:bg-bg-dark border-border-light dark:border-border-dark text-muted-light dark:text-muted-dark'
              } font-mono text-[10px] font-bold tracking-wider`}
            >
              {p}
            </motion.div>
          ))}
        </div>
      </div>
      <p className="text-f10 font-mono tracking-[0.2em] uppercase text-muted-light dark:text-muted-dark">
        Next: <span className="text-primary-light dark:text-primary-dark">{presenters[activeIdx]}</span>
      </p>
    </div>
  )
}

// 8. Events: calendar month grid
export function EventsVisual() {
  const cells = Array.from({ length: 35 })
  const events: Record<number, 'meeting' | 'visitor' | 'mixer'> = {
    3: 'meeting',
    10: 'meeting',
    17: 'visitor',
    24: 'meeting',
    31: 'mixer',
    8: 'mixer'
  }

  return (
    <div className="w-full h-full flex items-center justify-center p-6">
      <div className="grid grid-cols-7 gap-1 w-full max-w-xs">
        {cells.map((_, i) => {
          const type = events[i]
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.02 }}
              className="aspect-square border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark flex items-center justify-center"
            >
              {type && (
                <motion.div
                  animate={{ scale: [1, 1.4, 1] }}
                  transition={{ duration: 2, repeat: Infinity, delay: i * 0.1 }}
                  className={`w-1.5 h-1.5 rounded-full ${
                    type === 'meeting'
                      ? 'bg-primary-light dark:bg-primary-dark'
                      : type === 'visitor'
                        ? 'bg-cyan-500'
                        : 'bg-muted-light dark:bg-muted-dark'
                  }`}
                />
              )}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

// 9. Billing: animated credit card with tap-to-pay flow
export function BillingVisual() {
  const [stage, setStage] = useState<'card' | 'processing' | 'done'>('card')

  useEffect(() => {
    const cycle = () => {
      setStage('card')
      setTimeout(() => setStage('processing'), 1500)
      setTimeout(() => setStage('done'), 2800)
      setTimeout(() => setStage('card'), 4500)
    }
    cycle()
    const id = setInterval(cycle, 4800)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="w-full h-full flex items-center justify-center p-6">
      <div className="relative w-full max-w-xs">
        <motion.div
          animate={{
            y: stage === 'card' ? 0 : -8,
            opacity: stage === 'done' ? 0.5 : 1
          }}
          transition={{ duration: 0.5 }}
          className="aspect-[1.6/1] border-2 border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark p-4 flex flex-col justify-between relative overflow-hidden"
        >
          {/* Stripe-style gradient accent */}
          <div className="absolute top-0 right-0 w-20 h-20 bg-primary-light/5 dark:bg-primary-dark/10 blur-2xl rounded-full" />

          <div className="flex items-start justify-between">
            <div className="w-8 h-6 border border-muted-light/40 dark:border-muted-dark/40 bg-muted-light/10 dark:bg-muted-dark/10" />
            <p className="text-f10 font-mono tracking-[0.2em] uppercase text-muted-light dark:text-muted-dark">CORE</p>
          </div>

          <div className="relative">
            <p className="font-mono text-sm tracking-[0.25em] text-text-light dark:text-text-dark">
              •••• •••• •••• 4242
            </p>
            <div className="flex justify-between mt-2">
              <p className="text-[9px] font-mono tracking-[0.15em] uppercase text-muted-light dark:text-muted-dark">
                Annual Membership
              </p>
              <p className="text-[9px] font-mono tracking-[0.15em] uppercase text-muted-light dark:text-muted-dark">
                12/28
              </p>
            </div>
          </div>
        </motion.div>

        {/* Status indicator below card */}
        <motion.div
          animate={{ opacity: stage === 'card' ? 0 : 1 }}
          transition={{ duration: 0.3 }}
          className="mt-3 flex items-center gap-2 justify-center"
        >
          {stage === 'processing' && (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-3 h-3 border border-primary-light dark:border-primary-dark border-t-transparent rounded-full"
              />
              <p className="text-f10 font-mono tracking-[0.2em] uppercase text-primary-light dark:text-primary-dark">
                Processing
              </p>
            </>
          )}
          {stage === 'done' && (
            <>
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="text-primary-light dark:text-primary-dark text-sm"
              >
                ✓
              </motion.span>
              <p className="text-f10 font-mono tracking-[0.2em] uppercase text-primary-light dark:text-primary-dark">
                Paid · Renewed
              </p>
            </>
          )}
        </motion.div>
      </div>
    </div>
  )
}

// 10. Admin Dashboard: mini composite of stat tiles + sparkline
export function AdminDashboardVisual() {
  const sparkPath = 'M0,30 L15,25 L30,28 L45,18 L60,22 L75,12 L90,15 L105,8 L120,10'

  return (
    <div className="w-full h-full p-6">
      <div className="grid grid-cols-2 gap-2 mb-3">
        {[
          { label: 'Active Members', value: '14' },
          { label: 'YTD Referrals', value: '127' },
          { label: 'Attendance %', value: '94%' },
          { label: 'Visitors MTD', value: '6' }
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark p-3"
          >
            <p className="text-[9px] font-mono tracking-[0.15em] uppercase text-muted-light dark:text-muted-dark mb-1">
              {s.label}
            </p>
            <p className="font-sora font-black text-2xl text-text-light dark:text-text-dark leading-none">{s.value}</p>
          </motion.div>
        ))}
      </div>
      <div className="border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark p-3">
        <p className="text-[9px] font-mono tracking-[0.15em] uppercase text-muted-light dark:text-muted-dark mb-2">
          Attendance Trend · 90 days
        </p>
        <svg viewBox="0 0 120 40" className="w-full h-12">
          <motion.path
            d={sparkPath}
            fill="none"
            className="stroke-primary-light dark:stroke-primary-dark"
            strokeWidth="1.5"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2, ease: 'easeInOut' }}
          />
        </svg>
      </div>
    </div>
  )
}
