import getCurrentPageId from '@/app/lib/utils/common/getCurrentPageId'
import { setCloseMobileNavigation } from '@/app/lib/redux/slices/appSlice'
import { RootState, useAppDispatch, useAppSelector } from '@/app/lib/redux/store'
import useCustomPathname from '@/hooks/useCustomPathname'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Crown, Shield } from 'lucide-react'
import Link from 'next/link'
import { FC } from 'react'
import Drawer from '../common/Drawer'
import Backdrop from '../common/Backdrop'
import { itemVariants } from '@/app/lib/constants/motion'
import { useSession } from 'next-auth/react'

const MobileNavigationDrawer: FC<{ links: any }> = ({ links }) => {
  const dispatch = useAppDispatch()
  const close = () => dispatch(setCloseMobileNavigation())
  const { mobileNavigation } = useAppSelector((state: RootState) => state.app)
  const path = useCustomPathname()
  const selectedPage = getCurrentPageId(path, links)
  const session = useSession()
  const user = session.data?.user

  return (
    <AnimatePresence>
      {mobileNavigation && (
        <>
          <Backdrop onClose={close} />

          <Drawer>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border-light dark:border-border-dark">
              <div>
                <p className="text-f10 font-mono tracking-[0.2em] uppercase text-primary-light dark:text-primary-dark mb-0.5">
                  Coastal Referral Exchange
                </p>
                <h2 className="font-sora font-black text-[18px] text-text-light dark:text-text-dark tracking-tight leading-none">
                  Navigation
                </h2>
              </div>
              <button
                onClick={close}
                className="w-8 h-8 flex items-center justify-center text-muted-light dark:text-muted-dark hover:text-text-light dark:hover:text-text-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark"
                aria-label="Close navigation"
              >
                <X size={16} />
              </button>
            </div>

            {/* Nav items */}
            <nav className="flex-1 overflow-y-auto py-3 px-3" aria-label="Mobile navigation">
              <div className="flex flex-col gap-1">
                {links.map((item: any, index: number) => {
                  const isActive = selectedPage === item.id
                  return (
                    <Link key={item.id} href={item.linkKey} onClick={close}>
                      <motion.div
                        custom={index}
                        variants={itemVariants}
                        initial="closed"
                        animate="open"
                        className={`flex items-center gap-4 px-4 py-3.5 transition-colors ${
                          isActive
                            ? 'bg-primary-light/8 dark:bg-primary-dark/10 border-l-2 border-primary-light dark:border-primary-dark'
                            : 'hover:bg-surface-light dark:hover:bg-surface-dark border-l-2 border-transparent'
                        }`}
                      >
                        <div
                          className={`shrink-0 ${
                            isActive
                              ? 'text-primary-light dark:text-primary-dark'
                              : 'text-muted-light dark:text-muted-dark'
                          }`}
                        >
                          <item.icon size={18} aria-hidden="true" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`font-sora font-bold text-[13px] leading-tight ${
                              isActive
                                ? 'text-primary-light dark:text-primary-dark'
                                : 'text-text-light dark:text-text-dark'
                            }`}
                          >
                            {item.label}
                          </p>
                          {item.description && (
                            <p className="text-f10 font-nunito text-muted-light dark:text-muted-dark mt-0.5 truncate">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </motion.div>
                    </Link>
                  )
                })}
              </div>
            </nav>

            {/* Footer — user info */}
            <div className="px-5 py-4 border-t border-border-light dark:border-border-dark">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 shrink-0 bg-primary-light/10 dark:bg-primary-dark/10 border border-primary-light/20 dark:border-primary-dark/20 flex items-center justify-center">
                  {user?.isSuperUser ? (
                    <Crown size={14} className="text-primary-light dark:text-primary-dark" aria-hidden="true" />
                  ) : user?.isAdmin ? (
                    <Shield size={14} className="text-primary-light dark:text-primary-dark" aria-hidden="true" />
                  ) : (
                    <span className="text-f10 font-mono font-bold text-primary-light dark:text-primary-dark">
                      {user?.name?.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-sora font-bold text-[13px] text-text-light dark:text-text-dark truncate">
                    {user?.name}
                  </p>
                  <p className="text-f10 font-mono text-muted-light dark:text-muted-dark truncate">{user?.email}</p>
                </div>
              </div>
            </div>
          </Drawer>
        </>
      )}
    </AnimatePresence>
  )
}

export default MobileNavigationDrawer
