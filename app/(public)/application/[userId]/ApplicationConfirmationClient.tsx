'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { CheckCircle, User, Briefcase, MapPin, Phone, Mail, Building2, Hash } from 'lucide-react'

// ─── Types ─────────────────────────────────────────────────────────────────────
export interface ApplicationConfirmationProps {
  application: {
    name: string
    email: string
    phone?: string | null
    location?: string | null
    company: string
    industry: string
    businessLicenseNumber?: string | null
    isLicensed?: boolean
  }
}

// ─── Field row ─────────────────────────────────────────────────────────────────
function ConfirmRow({
  icon: Icon,
  label,
  value
}: {
  icon: React.ElementType
  label: string
  value: string | null | undefined
}) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3 py-3.5 border-b border-border-light dark:border-border-dark last:border-0">
      <div className="w-7 h-7 shrink-0 flex items-center justify-center bg-primary-light/10 dark:bg-primary-dark/10 border border-primary-light/20 dark:border-primary-dark/20 mt-0.5">
        <Icon size={13} className="text-primary-light dark:text-primary-dark" aria-hidden="true" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-f10 font-mono tracking-[0.15em] uppercase text-muted-light dark:text-muted-dark mb-0.5">
          {label}
        </p>
        <p className="text-[14px] font-nunito text-text-light dark:text-text-dark wrap-break-word">{value}</p>
      </div>
    </div>
  )
}

// ─── Main ──────────────────────────────────────────────────────────────────────
export default function ApplicationConfirmation({ application }: ApplicationConfirmationProps) {
  return (
    <div className="min-h-screen bg-bg-light dark:bg-bg-dark">
      <div className="max-w-140 mx-auto px-4 py-12">
        {/* ── Success banner ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="text-center mb-10"
        >
          <div className="w-14 h-14 flex items-center justify-center bg-emerald-50 dark:bg-emerald-400/10 border border-emerald-200 dark:border-emerald-400/20 mx-auto mb-5">
            <CheckCircle size={24} className="text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          </div>
          <p className="text-f10 font-mono tracking-[0.2em] uppercase text-primary-light dark:text-primary-dark mb-2">
            Application Received
          </p>
          <h1 className="font-sora font-black text-[28px] text-text-light dark:text-text-dark tracking-tight leading-tight mb-3">
            Thanks, {application.name.split(' ')[0]}.
          </h1>
          <p className="text-[14px] font-nunito text-muted-light dark:text-muted-dark leading-relaxed max-w-sm mx-auto">
            Your application has been submitted. An administrator will review it shortly and you'll receive an email.
          </p>
        </motion.div>

        {/* ── Application summary ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.18, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="border border-border-light dark:border-border-dark mb-8"
        >
          <div className="px-4 py-3 border-b border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark">
            <p className="text-f10 font-mono tracking-[0.2em] uppercase text-primary-light dark:text-primary-dark">
              Your Application
            </p>
          </div>
          <div className="px-4">
            <ConfirmRow icon={User} label="Full Name" value={application.name} />
            <ConfirmRow icon={Mail} label="Email" value={application.email} />
            <ConfirmRow icon={Phone} label="Phone" value={application.phone} />
            <ConfirmRow icon={MapPin} label="Location" value={application.location} />
            <ConfirmRow icon={Building2} label="Business" value={application.company} />
            <ConfirmRow icon={Briefcase} label="Industry" value={application.industry} />
            {application.isLicensed && (
              <ConfirmRow icon={Hash} label="License Number" value={application.businessLicenseNumber} />
            )}
          </div>
        </motion.div>

        {/* ── Notice ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.24, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="border-l-2 border-primary-light dark:border-primary-dark bg-primary-light/5 dark:bg-primary-dark/5 px-4 py-4 mb-8"
        >
          <p className="text-[12.5px] font-nunito text-text-light dark:text-text-dark leading-relaxed">
            All updates will be sent to <strong>{application.email}</strong>. Check your spam folder if you don't hear
            back within 2 business days.
          </p>
        </motion.div>

        {/* ── Back link ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="text-center"
        >
          <Link
            href="/"
            className="text-f10 font-mono tracking-[0.15em] uppercase text-muted-light dark:text-muted-dark hover:text-primary-light dark:hover:text-primary-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark"
          >
            ← Back to Home
          </Link>
        </motion.div>
      </div>
    </div>
  )
}
