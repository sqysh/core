import { AnimatePresence, motion } from 'framer-motion'
import { Check, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { getNextQuarterlyDueDate } from '@/lib/utils/billing.utils'
import { useSounds } from '@/lib/hooks/useSounds'
import { Typewriter } from '@/components/_shared/Typewriter'
import { MembershipSetupForm } from './MembershipSetupForm'
import { useAppStore } from '@/lib/store/appStore'

export function MembershipPaymentSetupModal() {
  const { membershipPaymentSetupModal, closeMembershipPaymentSetupModal } = useAppStore()
  const { play } = useSounds({ enabled: true })
  const onClose = () => {
    play('se10')
    closeMembershipPaymentSetupModal()
  }
  const [joinMonth, setJoinMonth] = useState('')
  const [joinDay, setJoinDay] = useState('')

  // Compute display dates only when both inputs are filled
  const { firstQuarterlyDate, annualRenewalDate } = useMemo(() => {
    const month = parseInt(joinMonth, 10)
    const day = parseInt(joinDay, 10)

    if (!month || !day || month < 1 || month > 12 || day < 1 || day > 31) {
      return { firstQuarterlyDate: null, annualRenewalDate: null }
    }

    const firstQuarterlyDate = getNextQuarterlyDueDate()

    const today = new Date()
    let annual = new Date(today.getFullYear(), month - 1, day)
    if (annual <= today) {
      annual = new Date(today.getFullYear() + 1, month - 1, day)
    }
    const annualRenewalDate = annual.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })

    return { firstQuarterlyDate, annualRenewalDate }
  }, [joinMonth, joinDay])

  return (
    <AnimatePresence>
      {membershipPaymentSetupModal && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 z-40 backdrop-blur-sm"
            style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}
          />
          <motion.div
            initial={{ y: 28, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 28, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="fixed inset-x-0 bottom-0 z-50 flex justify-center max-h-[90vh]"
          >
            <div
              className="w-full max-w-170 bg-bg-light dark:bg-surface-dark border-t-[3px] border-t-primary-light dark:border-t-primary-dark px-4 xs:px-6 pt-6 xs:pt-7 overflow-y-auto overscroll-contain"
              style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="font-sora font-black text-[22px] xs:text-[26px] text-text-light dark:text-text-dark tracking-tight leading-tight mb-1">
                    <Typewriter text="Set up automatic payments" />
                  </h2>
                  <p className="font-nunito text-[15px] text-muted-light dark:text-muted-dark">
                    You will not be charged anything today.
                  </p>
                </div>
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="mt-1 p-2 text-muted-light dark:text-muted-dark hover:text-text-light dark:hover:text-text-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark"
                >
                  <X size={22} />
                </button>
              </div>

              {/* What this does */}
              <div className="border border-border-light dark:border-border-dark bg-surface-light dark:bg-bg-dark p-4 xs:p-5 mb-6">
                <p className="font-sora font-bold text-[15px] text-text-light dark:text-text-dark mb-3">
                  Here is what happens when you save your card:
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2.5 xs:gap-3">
                    <Check
                      size={18}
                      className="text-primary-light dark:text-primary-dark shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                    <p className="font-nunito text-[15px] text-text-light dark:text-text-dark leading-relaxed">
                      Your card is saved securely.{' '}
                      <span className="text-muted-light dark:text-muted-dark">Nothing is charged right now.</span>
                    </p>
                  </li>
                  <li className="flex items-start gap-2.5 xs:gap-3">
                    <Check
                      size={18}
                      className="text-primary-light dark:text-primary-dark shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                    <p className="font-nunito text-[15px] text-text-light dark:text-text-dark leading-relaxed">
                      Room dues of <strong>$60</strong>
                      {firstQuarterlyDate ? (
                        <>
                          {' '}
                          will be charged on <strong>{firstQuarterlyDate}</strong>, then every three months after.
                        </>
                      ) : (
                        <> will be charged at the start of next quarter, then every three months after.</>
                      )}
                    </p>
                  </li>
                  <li className="flex items-start gap-2.5 xs:gap-3">
                    <Check
                      size={18}
                      className="text-primary-light dark:text-primary-dark shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                    <p className="font-nunito text-[15px] text-text-light dark:text-text-dark leading-relaxed">
                      Annual admission of <strong>$365</strong>
                      {annualRenewalDate ? (
                        <>
                          {' '}
                          will renew on <strong>{annualRenewalDate}</strong>, then once a year after that.
                        </>
                      ) : (
                        <> will renew once a year on your join anniversary.</>
                      )}
                    </p>
                  </li>
                </ul>
              </div>

              {/* Reassurance line */}
              <p className="font-nunito text-[14px] text-muted-light dark:text-muted-dark leading-relaxed mb-6">
                You can change or remove your card any time from your dashboard. We will email you a receipt every time
                you are charged.
              </p>

              {/* Card form */}
              <MembershipSetupForm
                onClose={onClose}
                joinMonth={joinMonth}
                setJoinMonth={setJoinMonth}
                joinDay={joinDay}
                setJoinDay={setJoinDay}
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
