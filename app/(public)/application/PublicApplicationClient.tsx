'use client'

import { createUser } from '@/app/lib/actions/user/createUser'
import { createFormActions } from '@/app/lib/redux/slices/formSlice'
import { showToast } from '@/app/lib/redux/slices/toastSlice'
import { store, useAppSelector } from '@/app/lib/redux/store'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { MemberApplicationForm } from '@/app/components/public/apply/MemberApplicationForm'
import Link from 'next/link'
import { CreateUserInput } from '@/types/user.types'
import { useSounds } from '@/app/lib/hooks/useSounds'
import isValidEmail from '@/app/lib/regex/isValidEmail'

export const useFormSelector = () => useAppSelector((state) => state.form.forms)

interface ApplicationFormInputs {
  name: string
  email: string
  company: string
  industry: string
  location: string
  phone: string
  businessLicenseNumber: string
}

const validateApplicationForm = (inputs: ApplicationFormInputs, setErrors: (newErrors: any) => void) => {
  const newErrors: any = {}

  if (!inputs?.name?.trim()) {
    newErrors.name = 'Please enter valid name'
  }

  if (!isValidEmail(inputs?.email)) {
    newErrors.email = 'Please enter valid email'
  }

  if (!inputs?.company?.trim()) {
    newErrors.company = 'Please enter valid company'
  }

  if (!inputs?.location?.trim()) {
    newErrors.location = 'Please enter valid location'
  }

  if (!inputs?.industry?.trim()) {
    newErrors.industry = 'Please enter valid industry'
  }

  if (!inputs?.phone?.trim() || inputs.phone.replace(/\D/g, '').length < 10) {
    newErrors.phone = 'Please enter a valid 10-digit phone number'
  }

  if (!inputs?.businessLicenseNumber?.trim()) {
    newErrors.businessLicenseNumber = 'Please enter valid businees license number'
  }

  setErrors(newErrors)
  return Object.keys(newErrors).length === 0
}

export default function PublicApplicationClient() {
  const { handleInput, setErrors, resetForm } = createFormActions('applicationForm', store.dispatch)
  const { applicationForm } = useFormSelector()
  const inputs = applicationForm?.inputs
  const errors = applicationForm?.errors
  const { push, refresh } = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const { play } = useSounds({ enabled: true, volume: 0.4 })

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault()
    if (!validateApplicationForm(inputs as CreateUserInput, setErrors)) return

    setIsLoading(true)
    const result = await createUser(inputs as CreateUserInput)
    setIsLoading(false)

    if (!result.success) {
      store.dispatch(
        showToast({
          type: 'error',
          message: 'Submission failed',
          description: result.error ?? 'Something went wrong. Please try again.'
        })
      )
      return
    }
    play('se2')
    resetForm()
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

        <MemberApplicationForm
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
