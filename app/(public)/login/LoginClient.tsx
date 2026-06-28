'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { motion } from 'framer-motion'
import { LoginCard } from '@/app/components/auth/LoginCard'
import LoginFeatures from '@/app/components/auth/LoginFeatures'
import LoginHeader from '@/app/components/auth/LoginHeader'
import { useSearchParams } from 'next/navigation'
import { ShieldX } from 'lucide-react'
import getAuthErrorMessage from '@/app/lib/utils/auth/getAuthErrorMessage'

export function LoginClient() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isEmailSent, setIsEmailSent] = useState(false)
  const [error, setError] = useState('')
  const searchParams = useSearchParams()
  const urlError = searchParams.get('error')
  const errorInfo = urlError ? getAuthErrorMessage(urlError, email) : null
  const redirectTo = searchParams.get('callbackUrl') ?? '/dashboard'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const result = await signIn('email', {
        email,
        redirect: false,
        redirectTo
      })

      if (result?.error) {
        setError('Failed to send magic link. Please try again.')
      } else {
        setIsEmailSent(true)
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="h-dvh overflow-hidden bg-bg-light dark:bg-surface-dark flex flex-col px-4 py-6 xs:py-10 xs:items-center xs:justify-center">
      <div className="w-full max-w-sm xs:mx-auto flex flex-col justify-between h-full xs:h-auto">
        <div>
          <LoginHeader />

          {urlError && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="mb-4 border-l-2 border-red-500 bg-red-50 dark:bg-red-500/5 px-3 py-2"
            >
              <div className="flex items-start gap-2.5">
                <ShieldX className="w-3.5 h-3.5 text-red-500 dark:text-red-400 mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <p className="text-[12px] font-sora font-bold text-red-600 dark:text-red-400 mb-0.5">
                    {errorInfo?.title}
                  </p>
                  <p className="text-[11px] font-nunito text-red-500 dark:text-red-400/80 leading-relaxed">
                    {errorInfo?.message}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          <LoginCard
            email={email}
            error={error}
            handleSubmit={handleSubmit}
            isEmailSent={isEmailSent}
            isLoading={isLoading}
            setEmail={setEmail}
            setError={setError}
            setIsEmailSent={setIsEmailSent}
            redirectTo={redirectTo}
          />

          <LoginFeatures />
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="text-center pt-4 pb-2 xs:mt-6 xs:pb-0"
        >
          <p className="text-f10 font-mono tracking-widest text-muted-light dark:text-muted-dark">
            Coastal Referral Exchange
          </p>
        </motion.div>
      </div>
    </div>
  )
}
