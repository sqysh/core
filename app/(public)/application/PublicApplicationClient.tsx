'use client'

import { createUser } from '@/lib/actions/user/createUser'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ApplicationForm } from '@/app/(public)/application/_components/ApplicationForm'
import Link from 'next/link'
import { CreateUserInput } from '@/types/user.types'
import { useSounds } from '@/lib/hooks/useSounds'
import { ApplicationFormInputs } from '@/app/(public)/application/_types/application.types'
import { validate } from './_lib/validate'

const EMPTY_INPUTS: ApplicationFormInputs = {
  name: '',
  email: '',
  company: '',
  industry: '',
  location: '',
  phone: '',
  businessLicenseNumber: ''
}

export default function PublicApplicationClient() {
  const [inputs, setInputs] = useState<ApplicationFormInputs>(EMPTY_INPUTS)
  const [errors, setErrors] = useState<Partial<Record<keyof ApplicationFormInputs, string>>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { push, refresh } = useRouter()
  const { play } = useSounds({ enabled: true, volume: 0.4 })

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setInputs((prev) => ({ ...prev, [name]: value }))
    if (errors[name as keyof ApplicationFormInputs]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null)
    const newErrors = validate(inputs)
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setIsLoading(true)
    const result = await createUser(inputs as CreateUserInput)
    setIsLoading(false)

    if (!result.success) {
      setSubmitError(result.error ?? 'Something went wrong. Please try again.')
      return
    }

    play('se2')
    setInputs(EMPTY_INPUTS)
    setErrors({})
    refresh()
    push(`/application/${result.user.id}`)
  }

  return (
    <div className="min-h-screen bg-bg-light dark:bg-bg-dark">
      <header className="border-b border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark sticky top-0 z-30">
        <div className="max-w-350 mx-auto px-4 xs:px-6 h-12 flex items-center justify-between">
          <Link
            href="/"
            className="font-sora font-black text-[18px] tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark"
            aria-label="Coastal Referral Exchange — Home"
          >
            <span className="text-text-light dark:text-text-dark">CORE</span>
            <span className="text-primary-light dark:text-primary-dark">.</span>
          </Link>
          <Link
            href="/login"
            className="h-8 px-4 bg-primary-light dark:bg-button-dark text-white font-sora font-bold text-[11px] tracking-wide hover:opacity-90 transition-opacity inline-flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark focus-visible:ring-offset-2"
          >
            Sign In
          </Link>
        </div>
      </header>

      <div className="max-w-170 mx-auto px-4 xs:px-6 pb-12">
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="pt-10 pb-8 border-b border-border-light dark:border-border-dark mb-8"
        >
          <Link
            href="/members"
            className="inline-flex items-center gap-1.5 text-f10 font-mono tracking-[0.15em] uppercase text-muted-light dark:text-muted-dark hover:text-primary-light dark:hover:text-primary-dark transition-colors mb-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark"
          >
            <ArrowLeft size={13} aria-hidden="true" />
            Back
          </Link>
          <p className="text-f10 font-mono tracking-[0.2em] uppercase text-primary-light dark:text-primary-dark mb-2">
            Coastal Referral Exchange
          </p>
          <h1 className="font-sora font-black text-[28px] text-text-light dark:text-text-dark tracking-tight leading-none">
            Apply for Membership
          </h1>
        </motion.div>

        <AnimatePresence>
          {submitError && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="flex items-start gap-3 px-4 py-3.5 mb-6 border border-red-200 dark:border-red-400/20 bg-red-50 dark:bg-red-400/10 border-l-2 border-l-red-500"
              role="alert"
            >
              <AlertCircle size={15} className="text-red-500 dark:text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="font-sora font-bold text-[13px] text-red-700 dark:text-red-400">Submission failed</p>
                <p className="text-[12px] font-nunito text-red-600 dark:text-red-400/80 mt-0.5">{submitError}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <ApplicationForm
          inputs={inputs}
          errors={errors}
          handleInput={handleInput}
          handleSubmit={handleSubmit}
          isLoading={isLoading}
        />
      </div>
    </div>
  )
}
