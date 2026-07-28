'use client'

import Spline from '@splinetool/react-spline'
import { motion } from 'framer-motion'
import { Handshake, Users, Calendar } from 'lucide-react'

const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, easing: [0.16, 1, 0.3, 1] } }
}

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } }
}

const PILLARS = [
  {
    icon: Handshake,
    title: 'Share Opportunities',
    body: 'Connect with the right people, exchange quality referrals, and grow your business faster.'
  },
  {
    icon: Users,
    title: 'Offer Advice',
    body: "Share best practices and real experience to strengthen each other's businesses."
  },
  {
    icon: Calendar,
    title: 'Meet One-on-One',
    body: 'Schedule face-to-face meetings to deepen understanding and build lasting trust.'
  }
]

export function PurposeOverview() {
  return (
    <motion.section
      className="py-16 md:py-24 bg-bg-dark relative"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
    >
      <div className="absolute inset-0 z-0">
        <Spline
          scene="https://prod.spline.design/VYhiiVwZv5j9V3XG/scene.splinecode"
          style={{
            background: 'transparent',
            width: '100%',
            height: '100%'
          }}
        />
        {/* Left fade so text stays readable */}
        <div className="absolute inset-y-0 left-0 w-2/3 bg-linear-to-r from-bg-dark via-bg-dark/80 to-transparent pointer-events-none z-10" />
        {/* Top + bottom fades */}
        <div className="absolute inset-x-0 top-0 h-24 bg-linear-to-b from-bg-dark to-transparent pointer-events-none z-10" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-bg-dark to-transparent pointer-events-none z-10" />
      </div>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-1 pointer-events-none">
        {/* ── Header ── */}
        <motion.div variants={fadeInUp} className="mb-12 md:mb-16 max-w-2xl">
          <div className="flex items-center gap-3 mb-5">
            <span className="block w-5 h-px bg-primary-dark shrink-0" aria-hidden="true" />
            <p className="text-f10 font-mono tracking-[0.2em] uppercase text-primary-dark">Purpose Overview</p>
          </div>
          <h2 className="font-sora font-black text-3xl sm:text-4xl lg:text-5xl text-text-dark leading-[1.05] tracking-tight mb-5">
            Why CORE works
          </h2>
          <p className="font-nunito text-base sm:text-lg text-muted-dark leading-relaxed">
            Coastal Referral Exchange brings together a select group of business owners from the North Shore with one
            clear goal — helping each other succeed through referrals, advice, and genuine collaboration.
          </p>
        </motion.div>

        {/* ── Three pillars ── */}
        <motion.div variants={stagger} className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-12 md:mb-16">
          {PILLARS.map(({ icon: Icon, title, body }) => (
            <motion.div key={title} variants={fadeInUp} className="border border-border-dark bg-surface-dark px-6 py-8">
              <div className="w-10 h-10 flex items-center justify-center border border-primary-dark/30 bg-primary-dark/10 mb-5">
                <Icon size={18} className="text-primary-light dark:text-primary-dark" aria-hidden="true" />
              </div>
              <h3 className="font-sora font-bold text-[15px] text-text-dark leading-tight mb-2">{title}</h3>
              <p className="font-nunito text-sm text-muted-dark leading-relaxed">{body}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* ── Footer copy ── */}
        <motion.div variants={fadeInUp} className="border-l-2 border-primary-dark pl-5">
          <p className="font-nunito text-base sm:text-lg text-muted-dark leading-relaxed max-w-3xl">
            By consistently showing up for one another, members create momentum, foster opportunities, and navigate the
            path to greater business success — together.
          </p>
        </motion.div>
      </div>
    </motion.section>
  )
}
