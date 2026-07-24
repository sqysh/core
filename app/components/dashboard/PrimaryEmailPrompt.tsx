'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { EMAIL_REGEX } from '@/app/lib/utils/regex'
import { updateEmail } from '@/app/lib/actions/user/updateEmail'
import { useSession } from 'next-auth/react'
import { useSounds } from '@/app/lib/hooks/useSounds'

export function PrimaryEmailPrompt() {
  const session = useSession()
  const currentEmail = session.data?.user?.email
  const [email, setEmail] = useState(currentEmail ?? '')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const { play } = useSounds({ enabled: true, volume: 0.4 })

  const unchanged = email.trim() === currentEmail

  async function handleSave() {
    if (!email.trim() || unchanged) return
    if (!EMAIL_REGEX.test(email.trim())) {
      setError('Please enter a valid email address.')
      return
    }
    setError('')
    setIsLoading(true)
    const res = await updateEmail(email.trim())
    setIsLoading(false)
    if (res.success) {
      play('se3')
      router.refresh()
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.3 }}
        className="relative overflow-hidden border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark px-4 py-3"
      >
        {/* @ watermark */}
        <span
          aria-hidden="true"
          className="absolute left-2 top-1/3 -translate-y-1/2 text-[40px] font-sora font-black text-slate-200 dark:text-slate-700 pointer-events-none select-none leading-none"
        >
          @
        </span>

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-f10 font-mono tracking-[0.15em] uppercase text-muted-light dark:text-muted-dark shrink-0">
              Primary Email
            </span>
            <span className="text-border-light dark:text-border-dark" aria-hidden="true">
              ·
            </span>
            <p className="text-[12px] font-nunito text-muted-light dark:text-muted-dark truncate">
              Update the primary email used to sign in with a magic link.
            </p>
          </div>

          <div className="flex items-stretch gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setError('')
              }}
              placeholder="you@example.com"
              autoCapitalize="off"
              spellCheck={false}
              aria-label="Primary email address"
              className="flex-1 h-9 px-3 bg-white dark:bg-bg-dark border border-slate-300 dark:border-border-dark font-nunito text-[13px] text-text-light dark:text-text-dark placeholder:text-slate-400 dark:placeholder:text-muted-dark/50 focus:outline-none focus:border-primary-light dark:focus:border-primary-dark transition-colors rounded-none"
            />
            <button
              onClick={handleSave}
              disabled={!email.trim() || unchanged || isLoading}
              className="h-9 px-4 bg-primary-light dark:bg-button-dark text-white font-sora font-bold text-[11px] tracking-wide hover:opacity-90 transition-opacity disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark shrink-0"
            >
              {isLoading ? 'Saving…' : 'Save'}
            </button>
          </div>

          {error && <p className="mt-1.5 text-[11px] font-mono text-red-500 dark:text-red-400">{error}</p>}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
