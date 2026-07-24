'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { createVisitor } from '@/app/lib/actions/visitor/createVisitor'
import { EMAIL_REGEX } from '@/app/lib/utils/regex'
import { CreateVisitorModal } from '../modals/CreateVisitorModal'
import { Visitor } from '@/types/visitor.types'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSounds } from '@/app/lib/hooks/useSounds'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Field {
  key: keyof FormState
  label: string
  type?: string
  placeholder: string
  required?: boolean
  span?: 'full' | 'half'
}

export interface FormState {
  firstName: string
  lastName: string
  email: string
  company: string
  industry: string
  phone: string
  visitDate: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const INITIAL_STATE: FormState = {
  firstName: '',
  lastName: '',
  email: '',
  company: '',
  industry: '',
  phone: '',
  visitDate: ''
}

// ─── Visitor Row ──────────────────────────────────────────────────────────────

function VisitorRow({ visitor }: { visitor: Visitor }) {
  const date = new Date(`${visitor.visitDate.toISOString().slice(0, 10)}T12:00:00`)
  const dateLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border-light dark:border-border-dark last:border-b-0">
      {/* Date chip */}
      <div className="shrink-0 w-14 text-center">
        <p className="text-f10 font-mono tracking-widest uppercase text-primary-light dark:text-primary-dark leading-none">
          {dateLabel.split(' ')[0]}
        </p>
        <p className="text-base font-sora font-bold text-text-light dark:text-text-dark leading-tight">
          {dateLabel.split(' ')[1]}
        </p>
      </div>

      {/* Divider */}
      <div className="w-px self-stretch bg-border-light dark:bg-border-dark shrink-0" aria-hidden="true" />

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-sora font-semibold text-text-light dark:text-text-dark truncate leading-tight">
          {visitor.firstName} {visitor.lastName}
        </p>
        <p className="text-xs font-nunito text-muted-light dark:text-muted-dark truncate mt-0.5">{visitor.email}</p>
      </div>

      {/* Invited by (if shown) */}
      {visitor.invitedBy && (
        <p className="text-f10 font-mono tracking-widest uppercase text-muted-light dark:text-muted-dark shrink-0 hidden sm:block">
          via {visitor.invitedBy.name}
        </p>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function VisitorPanel({
  visitors,
  closestVisitorDay
}: {
  visitors: Visitor[]
  closestVisitorDay: string
}) {
  const { play } = useSounds({ enabled: true, volume: 0.4 })
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<FormState>(INITIAL_STATE)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const onOpen = () => setOpen(true)
  const onClose = () => setOpen(false)

  async function handleSubmit() {
    if (status === 'loading') return

    // Client-side validation
    if (!form.firstName.trim()) {
      setStatus('error')
      setErrorMsg('First name is required.')
      return
    }
    if (!form.lastName.trim()) {
      setStatus('error')
      setErrorMsg('Last name is required.')
      return
    }
    if (!form.email.trim() || !EMAIL_REGEX.test(form.email.trim())) {
      setStatus('error')
      setErrorMsg('A valid email address is required.')
      return
    }

    setStatus('loading')
    setErrorMsg('')

    const result = await createVisitor({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      company: form.company.trim(),
      industry: form.industry.trim(),
      phone: form.phone.trim() || undefined,
      visitDate: closestVisitorDay || form.visitDate
    })

    if (result.success) {
      play('se2')
      router.refresh()
      setOpen(false)

      setForm(INITIAL_STATE)
      setStatus('idle')
      setErrorMsg('')
    } else {
      setStatus('error')
      setErrorMsg(result.error ?? 'Something went wrong.')
    }
  }

  return (
    <>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Modal */}
          <CreateVisitorModal
            errorMsg={errorMsg}
            form={form}
            handleClose={onClose}
            handleSubmit={handleSubmit}
            setForm={setForm}
            open={open}
            status={status}
            closestVisitorDay={closestVisitorDay}
          />
        </>
      )}

      <div className="border border-border-light dark:border-border-dark">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border-light dark:border-border-dark flex items-center justify-between gap-3">
          <p className="text-f10 font-mono tracking-widest uppercase text-muted-light dark:text-muted-dark">
            {visitors.length > 0
              ? `${visitors.length} upcoming ${visitors.length === 1 ? 'visitor' : 'visitors'}`
              : 'No visitors logged yet'}
          </p>
          <button
            onClick={onOpen}
            aria-label="Add a visitor"
            className="shrink-0 h-8 px-3 border border-border-light dark:border-border-dark text-muted-light dark:text-muted-dark hover:text-primary-light dark:hover:text-primary-dark hover:border-primary-light dark:hover:border-primary-dark transition-colors text-f10 font-mono tracking-widest uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark inline-flex items-center gap-1.5"
          >
            + Add
          </button>
        </div>

        {/* List or empty copy */}
        {visitors.length > 0 ? (
          <div>
            {visitors.map((v) => (
              <VisitorRow key={v.id} visitor={v} />
            ))}
          </div>
        ) : (
          <div className="px-4 py-3">
            <p className="text-xs font-nunito text-muted-light dark:text-muted-dark leading-relaxed">
              Bringing a guest to a meeting? Log them here so the group knows who to expect.
            </p>
            <p className="text-f10 font-mono tracking-widest uppercase text-muted-light dark:text-muted-dark mt-2">
              No Visitor Day scheduled ·{' '}
              <span className="text-primary-light dark:text-primary-dark">Add a visitor for any Thursday</span>
            </p>
          </div>
        )}

        {/* View past */}
        <div className="px-4 py-3 border-t border-border-light dark:border-border-dark">
          <Link
            href="/visitors"
            className="text-f10 font-mono tracking-widest uppercase text-muted-light dark:text-muted-dark hover:text-primary-light dark:hover:text-primary-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark"
          >
            View Past →
          </Link>
        </div>
      </div>
    </>
  )
}
