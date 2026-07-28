'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'

const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, easing: [0.16, 1, 0.3, 1] } }
}

export function CTASection() {
  return (
    <motion.section
      className="py-16 md:py-24 bg-bg-light dark:bg-bg-dark border-t border-border-light dark:border-border-dark"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-8">
          {/* Left — copy */}
          <div className="max-w-lg">
            <div className="flex items-center gap-3 mb-5">
              <span className="block w-5 h-px bg-primary-light dark:bg-primary-dark shrink-0" aria-hidden="true" />
              <p className="text-f10 font-mono tracking-[0.2em] uppercase text-primary-light dark:text-primary-dark">
                Ready to Join?
              </p>
            </div>
            <h2 className="font-sora font-black text-3xl sm:text-4xl lg:text-5xl text-text-light dark:text-text-dark leading-[1.05] tracking-tight mb-4">
              Your seat at the table is waiting.
            </h2>
            <p className="font-nunito text-base sm:text-lg text-muted-light dark:text-muted-dark leading-relaxed">
              If your industry seat is open and you're ready to show up every Thursday and build something real — we'd
              love to have you apply.
            </p>
          </div>

          {/* Right — CTAs */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
            <Link
              href="/application"
              className="inline-flex items-center h-12 px-8 bg-primary-light dark:bg-primary-dark text-white font-sora font-bold text-sm tracking-wide hover:opacity-90 active:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark focus-visible:ring-offset-2"
            >
              Apply Today →
            </Link>
            <Link
              href="/visitors-welcome"
              className="inline-flex items-center h-12 px-8 border border-border-light dark:border-border-dark text-muted-light dark:text-muted-dark font-sora font-bold text-sm tracking-wide hover:text-primary-light dark:hover:text-primary-dark hover:border-primary-light dark:hover:border-primary-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark"
            >
              Visit First
            </Link>
          </div>
        </motion.div>
      </div>
    </motion.section>
  )
}
