'use client'

import { FC } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { IForm } from '@/types/forms.types'
import { formatPhone } from '@/lib/utils/phone.utils'
import { SectionDivider } from '../../../../components/_shared/SectionDivider'
import { cityStates } from '@/lib/constants/public/application.constants'
import { FormField } from '../../../../components/_shared/FormField'

export const ApplicationForm: FC<IForm> = ({ inputs, errors, handleInput, handleSubmit, isLoading }) => {
  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      noValidate
    >
      <div className="border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark">
        {/* ── Personal Information ── */}
        <section
          aria-labelledby="personal-info"
          className="px-6 xs:px-8 pt-8 pb-8 border-b border-border-light dark:border-border-dark"
        >
          <SectionDivider label="Personal Information" />
          <div className="grid grid-cols-1 xs:grid-cols-2 gap-5">
            <div className="xs:col-span-2">
              <FormField
                id="name"
                label="Full Name"
                required
                value={inputs.name}
                onChange={handleInput}
                placeholder="Jane Smith"
                autoComplete="name"
                error={errors?.name}
              />
            </div>

            <div className="xs:col-span-2">
              <FormField
                id="email"
                label="Email Address"
                type="email"
                required
                value={inputs.email}
                onChange={handleInput}
                placeholder="jane@example.com"
                autoComplete="email"
                error={errors?.email}
              />
            </div>

            {/* Location — has datalist, stays manual */}
            <div>
              <FormField
                id="location"
                label="Location"
                required
                value={inputs.location}
                onChange={handleInput}
                placeholder="City, State"
                autoComplete="off"
                list="location-suggestions"
                error={errors?.location}
              />
              <datalist id="location-suggestions">
                {cityStates.map((city) => (
                  <option key={city} value={city} />
                ))}
              </datalist>
            </div>

            {/* Phone — has custom onChange formatting, stays manual */}
            <FormField
              id="phone"
              label="Phone Number"
              type="tel"
              required
              value={formatPhone(inputs.phone || '')}
              onChange={(e) =>
                handleInput({
                  ...e,
                  target: { ...e.target, name: 'phone', value: e.target.value.replace(/\D/g, '').slice(0, 10) }
                })
              }
              placeholder="9781112222"
              autoComplete="tel"
              error={errors?.phone}
            />
          </div>
        </section>

        {/* ── Business Information ── */}
        <section
          aria-labelledby="business-info"
          className="px-6 xs:px-8 pt-8 pb-8 border-b border-border-light dark:border-border-dark"
        >
          <SectionDivider label="Business Information" />
          <div className="grid grid-cols-1 xs:grid-cols-2 gap-5">
            <div className="xs:col-span-2">
              <FormField
                id="company"
                label="Business Name"
                required
                value={inputs.company}
                onChange={handleInput}
                placeholder="Your business name"
                autoComplete="organization"
                error={errors?.company}
              />
            </div>

            <FormField
              id="industry"
              label="Industry"
              required
              value={inputs.industry}
              onChange={handleInput}
              placeholder="e.g., Financial Advisor"
              error={errors?.industry}
            />

            <FormField
              id="businessLicenseNumber"
              label="License Number"
              required
              value={inputs.businessLicenseNumber}
              onChange={handleInput}
              placeholder="BL-12345678"
              error={errors?.businessLicenseNumber}
            />
          </div>
        </section>

        {/* ── Chapter ── */}
        <section
          aria-labelledby="chapter-info"
          className="px-6 xs:px-8 pt-8 pb-8 border-b border-border-light dark:border-border-dark"
        >
          <SectionDivider label="Chapter" />
          <div className="flex items-center justify-between px-4 py-3 border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark mb-2">
            <span className="font-nunito text-[14px] text-text-light dark:text-text-dark">
              North Shore Chapter · Thursdays 7:00 AM
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <span className="h-2 w-2 bg-emerald-400 rounded-full" aria-hidden="true" />
              <span className="text-f9 font-mono tracking-widest uppercase text-emerald-600 dark:text-emerald-400">
                Active
              </span>
            </div>
          </div>
          <p className="text-[11.5px] font-nunito text-muted-light dark:text-muted-dark mb-6">
            You will be assigned to the North Shore chapter based on your location.
          </p>
          <div className="border-l-2 border-primary-light dark:border-primary-dark bg-primary-light/5 dark:bg-primary-dark/5 px-4 py-4">
            <p className="text-f10 font-mono tracking-[0.15em] uppercase text-primary-light dark:text-primary-dark mb-1.5">
              Review Process
            </p>
            <p className="text-[12.5px] font-nunito text-text-light dark:text-text-dark leading-relaxed">
              After submitting you'll receive an initial confirmation email. Our membership team will review your
              application and reach out if we need anything. Once a decision has been made you'll receive a final email
              letting you know whether you've been accepted into the chapter.
            </p>
          </div>
        </section>

        {/* ── Submit ── */}
        <div className="px-6 xs:px-8 py-6 flex flex-col xs:flex-row items-start xs:items-center justify-between gap-4">
          <p className="text-[11.5px] font-nunito text-muted-light dark:text-muted-dark max-w-sm">
            By submitting, you agree to Coastal Referral Exchange's code of conduct and referral terms.
          </p>
          <motion.button
            type="submit"
            disabled={isLoading}
            whileTap={{ scale: 0.98 }}
            className="h-12 px-8 bg-primary-light dark:bg-button-dark text-white font-sora font-bold text-sm tracking-wide hover:opacity-90 active:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark focus-visible:ring-offset-2 cursor-pointer shrink-0"
          >
            {isLoading ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="h-4 w-4 rounded-full border-2 border-white border-t-transparent"
                  aria-hidden="true"
                />
                Submitting…
              </>
            ) : (
              <>
                Submit Application
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </>
            )}
          </motion.button>
        </div>
      </div>
    </motion.form>
  )
}
