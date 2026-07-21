'use client'

import { FC } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { IForm } from '@/types/forms.types'
import { formatPhone } from '@/app/lib/utils/phone.utils'

const inputCls =
  'w-full h-12 bg-white dark:bg-bg-dark border border-slate-300 dark:border-border-dark px-3.5 font-nunito text-[15px] text-text-light dark:text-text-dark placeholder:text-slate-400 dark:placeholder:text-muted-dark/50 focus:outline-none focus:border-primary-light dark:focus:border-primary-dark focus:ring-1 focus:ring-primary-light/20 dark:focus:ring-primary-dark/20 transition-colors rounded-none'

// ─── Sub-components ────────────────────────────────────────────────────────────
function FieldLabel({
  htmlFor,
  required,
  children
}: {
  htmlFor: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-f10 font-mono tracking-[0.18em] uppercase text-muted-light dark:text-muted-dark mb-1.5"
    >
      {children}
      {required && (
        <span className="ml-1 text-primary-light dark:text-primary-dark" aria-hidden="true">
          *
        </span>
      )}
    </label>
  )
}

function ErrorText({ error }: { error: string }) {
  return (
    <p role="alert" className="mt-1.5 text-[11.5px] font-nunito text-red-500 dark:text-red-400">
      {error}
    </p>
  )
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <span className="block w-5 h-px bg-primary-light dark:bg-primary-dark shrink-0" aria-hidden="true" />
      <p className="text-f10 font-mono tracking-[0.2em] uppercase text-primary-light dark:text-primary-dark">{label}</p>
    </div>
  )
}

// ─── Main ──────────────────────────────────────────────────────────────────────
export const MemberApplicationForm: FC<IForm> = ({ inputs, errors, handleInput, handleSubmit, isLoading }) => {
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
              <FieldLabel htmlFor="name" required>
                Full Name
              </FieldLabel>
              <input
                id="name"
                type="text"
                name="name"
                value={inputs.name || ''}
                onChange={handleInput}
                className={inputCls}
                placeholder="Jane Smith"
                autoComplete="name"
                aria-required="true"
                aria-invalid={!!errors?.name}
              />
              {errors?.name && <ErrorText error={errors.name} />}
            </div>

            <div className="xs:col-span-2">
              <FieldLabel htmlFor="email" required>
                Email Address
              </FieldLabel>
              <input
                id="email"
                type="email"
                name="email"
                value={inputs.email || ''}
                onChange={handleInput}
                className={inputCls}
                placeholder="jane@example.com"
                autoComplete="email"
                aria-required="true"
                aria-invalid={!!errors?.email}
              />
              {errors?.email && <ErrorText error={errors.email} />}
            </div>

            <div>
              <FieldLabel htmlFor="location" required>
                Location
              </FieldLabel>
              <input
                id="location"
                type="text"
                name="location"
                value={inputs.location || ''}
                onChange={handleInput}
                className={inputCls}
                placeholder="City, State"
                autoComplete="off"
                list="location-suggestions"
                aria-required="true"
                aria-invalid={!!errors?.location}
              />
              <datalist id="location-suggestions">
                {[
                  // Lynn itself
                  'Lynn, MA',
                  // Within ~5 miles
                  'Swampscott, MA',
                  'Saugus, MA',
                  'Nahant, MA',
                  'Revere, MA',
                  'Salem, MA',
                  'Marblehead, MA',
                  'Peabody, MA',
                  // Within ~10 miles
                  'Beverly, MA',
                  'Chelsea, MA',
                  'Danvers, MA',
                  'Everett, MA',
                  'Lynnfield, MA',
                  'Malden, MA',
                  'Medford, MA',
                  'Somerville, MA',
                  'Winthrop, MA',
                  // Within ~15 miles
                  'Andover, MA',
                  'Arlington, MA',
                  'Boston, MA',
                  'Braintree, MA',
                  'Burlington, MA',
                  'Cambridge, MA',
                  'Gloucester, MA',
                  'Hamilton, MA',
                  'Ipswich, MA',
                  'Lawrence, MA',
                  'Lexington, MA',
                  'Melrose, MA',
                  'Methuen, MA',
                  'Middleton, MA',
                  'North Andover, MA',
                  'Reading, MA',
                  'Rockport, MA',
                  'Stoneham, MA',
                  'Topsfield, MA',
                  'Wakefield, MA',
                  'Wenham, MA',
                  'Weston, MA',
                  'Woburn, MA',
                  // Within ~20 miles
                  'Amesbury, MA',
                  'Belmont, MA',
                  'Boxford, MA',
                  'Essex, MA',
                  'Georgetown, MA',
                  'Haverhill, MA',
                  'Manchester-by-the-Sea, MA',
                  'Merrimac, MA',
                  'Newburyport, MA',
                  'Newton, MA',
                  'Newtonville, MA',
                  'Quincy, MA',
                  'Rowley, MA',
                  'Watertown, MA',
                  'West Newton, MA',
                  'Winchester, MA'
                ].map((city) => (
                  <option key={city} value={city} />
                ))}
              </datalist>
              {errors?.location && <ErrorText error={errors.location} />}
            </div>

            <div>
              <FieldLabel htmlFor="phone" required>
                Phone Number
              </FieldLabel>
              <input
                id="phone"
                type="tel"
                name="phone"
                value={formatPhone(inputs.phone || '')}
                onChange={(e) =>
                  handleInput({
                    ...e,
                    target: { ...e.target, name: 'phone', value: e.target.value.replace(/\D/g, '').slice(0, 10) }
                  })
                }
                className={inputCls}
                placeholder="9781112222"
                autoComplete="tel"
                aria-required="true"
                aria-invalid={!!errors?.phone}
              />
              {errors?.phone && <ErrorText error={errors.phone} />}
            </div>
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
              <FieldLabel htmlFor="company" required>
                Business Name
              </FieldLabel>
              <input
                id="company"
                type="text"
                name="company"
                value={inputs.company || ''}
                onChange={handleInput}
                className={inputCls}
                placeholder="Your business name"
                autoComplete="organization"
                aria-required="true"
                aria-invalid={!!errors?.company}
              />
              {errors?.company && <ErrorText error={errors.company} />}
            </div>

            <div>
              <FieldLabel htmlFor="industry" required>
                Industry
              </FieldLabel>
              <input
                id="industry"
                type="text"
                name="industry"
                value={inputs.industry || ''}
                onChange={handleInput}
                className={inputCls}
                placeholder="e.g., Financial Advisor"
                aria-required="true"
                aria-invalid={!!errors?.industry}
              />
              {errors?.industry && <ErrorText error={errors.industry} />}
            </div>

            <div>
              <FieldLabel htmlFor="businessLicenseNumber" required>
                License Number
              </FieldLabel>
              <input
                id="businessLicenseNumber"
                type="text"
                name="businessLicenseNumber"
                value={inputs.businessLicenseNumber || ''}
                onChange={handleInput}
                className={inputCls}
                placeholder="BL-12345678"
                aria-required="true"
                aria-invalid={!!errors?.businessLicenseNumber}
              />
              {errors?.businessLicenseNumber && <ErrorText error={errors.businessLicenseNumber} />}
            </div>
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
