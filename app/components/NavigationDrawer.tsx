'use client'

import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { X } from 'lucide-react'
import { RootState, useAppDispatch, useAppSelector } from '../lib/redux/store'
import { setCloseNavigationDrawer } from '../lib/redux/slices/appSlice'

const NavigationDrawer = () => {
  const pathname = usePathname()
  const dispatch = useAppDispatch()
  const { navigationDrawer } = useAppSelector((state: RootState) => state.app)
  const onClose = () => dispatch(setCloseNavigationDrawer())

  const navLinks = [
    { name: 'Home', href: '/' },
    { name: 'Members', href: '/members' },
    { name: 'Apply', href: '/application' },
    { name: 'Sign In', href: '/auth/login' }
  ]

  return (
    <AnimatePresence>
      {navigationDrawer && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 z-40 backdrop-blur-sm"
            style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed top-0 right-0 h-full w-full bg-white dark:bg-bg-dark border-l border-border-light dark:border-border-dark z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border-light dark:border-border-dark shrink-0">
              <div>
                <p className="text-f10 font-mono tracking-[0.2em] uppercase text-primary-light dark:text-primary-dark mb-0.5">
                  Menu
                </p>
                <span className="font-sora font-black text-[18px] text-text-light dark:text-text-dark tracking-tight leading-none">
                  Coastal Referral Exchange
                </span>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center text-muted-light dark:text-muted-dark hover:text-text-light dark:hover:text-text-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark"
                aria-label="Close menu"
              >
                <X size={16} />
              </button>
            </div>

            {/* Nav links */}
            <nav className="flex-1 overflow-y-auto py-3 px-3" aria-label="Site navigation">
              <ul className="flex flex-col gap-1">
                {navLinks.map((link, i) => {
                  const isActive = pathname === link.href
                  return (
                    <motion.li
                      key={link.href}
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.25, delay: i * 0.06 }}
                    >
                      <Link
                        href={link.href}
                        onClick={onClose}
                        className={`flex items-center px-4 py-3.5 font-sora font-bold text-[15px] transition-colors border-l-2 ${
                          isActive
                            ? 'border-primary-light dark:border-primary-dark text-primary-light dark:text-primary-dark bg-primary-light/8 dark:bg-primary-dark/10'
                            : 'border-transparent text-text-light dark:text-text-dark hover:bg-surface-light dark:hover:bg-surface-dark'
                        }`}
                      >
                        {link.name}
                      </Link>
                    </motion.li>
                  )
                })}
              </ul>
            </nav>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-border-light dark:border-border-dark shrink-0">
              <p className="text-f10 font-mono tracking-widest text-muted-light dark:text-muted-dark text-center">
                © {new Date().getFullYear()} Coastal Referral Exchange
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default NavigationDrawer
