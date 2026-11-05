'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { createVisitor } from '@/lib/actions/visitor/createVisitor'
import { EMAIL_REGEX } from '@/lib/utils/regex.utils'
import { CreateVisitorModal } from './CreateVisitorModal'
import { Visitor } from '@/types/visitor.types'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSounds } from '@/lib/hooks/useSounds'
import { LinkBody } from '@/components/_shared/LinkBody'

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

const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark'

// ─── Visitor Row ──────────────────────────────────────────────────────────────

function VisitorRow({ visitor }: { visitor: Visitor }) {
  const date = new Date(`${new Date(visitor.visitDate).toISOString().slice(0, 10)}T12:00:00`)
  const [month, day] = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).split(' ')

  // Secondary line: what they do, then who's bringing them. Email is a
  // detail, not a headline, so it drops to the third line and only when there's room.
  const context = [visitor.company, visitor.industry].filter(Boolean).join(' · ')

  return (
    <li className="flex items-stretch gap-3 border-b border-border-light px-3 py-3 last:border-b-0 dark:border-border-dark sm:gap-4 sm:px-4 sm:py-3.5">
      {/* Date block: the one thing you scan the list by */}
      <div className="flex w-11 shrink-0 flex-col items-center justify-center border border-border-light bg-black/3 py-1.5 dark:border-border-dark dark:bg-white/3 sm:w-13">
        <p className="text-f9 font-mono uppercase leading-none tracking-[0.1em] text-primary-light dark:text-primary-dark">
          {month}
        </p>
        <p className="mt-1 font-sora text-[20px] font-black leading-none tabular-nums text-text-light dark:text-text-dark sm:text-[22px]">
          {day}
        </p>
      </div>

      {/* Who */}
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <p className="truncate font-sora text-[15px] font-bold leading-tight text-text-light dark:text-text-dark sm:text-[16px]">
          {visitor.firstName} {visitor.lastName}
        </p>

        {context && (
          <p className="mt-0.5 truncate font-nunito text-[13px] leading-snug text-text-light/80 dark:text-text-dark/80 sm:text-[14px]">
            {context}
          </p>
        )}

        <p className="mt-0.5 truncate font-mono text-[12px] leading-snug text-muted-light dark:text-muted-dark sm:text-[13px]">
          {visitor.invitedBy ? (
            <>
              via <span className="text-text-light dark:text-text-dark">{visitor.invitedBy.name}</span>
            </>
          ) : (
            visitor.email
          )}
        </p>
      </div>
    </li>
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

  const count = visitors.length

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
        {/* Header: the number is the headline, the word is the caption */}
        <div className="flex items-center justify-between gap-3 border-b border-border-light px-3 py-3 dark:border-border-dark sm:px-4">
          <div className="flex min-w-0 items-baseline gap-2">
            {count > 0 ? (
              <>
                <p className="font-sora text-[22px] font-black leading-none tabular-nums text-text-light dark:text-text-dark">
                  {count}
                </p>
                <p className="truncate font-mono text-[13px] text-muted-light dark:text-muted-dark sm:text-[14px]">
                  upcoming {count === 1 ? 'visitor' : 'visitors'}
                </p>
              </>
            ) : (
              <p className="font-mono text-[13px] text-muted-light dark:text-muted-dark sm:text-[14px]">
                No visitors logged yet
              </p>
            )}
          </div>

          <button
            onClick={onOpen}
            aria-label="Add a visitor"
            className={`inline-flex h-11 shrink-0 items-center gap-1.5 border border-border-light px-3 font-mono text-[13px] text-text-light transition-colors hover:border-primary-light hover:text-primary-light dark:border-border-dark dark:text-text-dark dark:hover:border-primary-dark dark:hover:text-primary-dark sm:px-4 sm:text-[14px] ${FOCUS}`}
          >
            <span aria-hidden="true">+</span> Add
          </button>
        </div>

        {/* List or empty copy */}
        {count > 0 ? (
          <ul>
            {visitors.map((v) => (
              <VisitorRow key={v.id} visitor={v} />
            ))}
          </ul>
        ) : (
          <div className="px-3 py-4 sm:px-4">
            <p className="font-nunito text-[15px] leading-relaxed text-text-light dark:text-text-dark">
              Bringing a guest to a meeting?
            </p>
            <p className="mt-1 font-nunito text-[14px] leading-relaxed text-muted-light dark:text-muted-dark">
              Log them here so the group knows who to expect.
            </p>
            <p className="mt-3 font-mono text-[12px] text-muted-light dark:text-muted-dark sm:text-[13px]">
              No Visitor Day scheduled ·{' '}
              <span className="text-primary-light dark:text-primary-dark">any Thursday works</span>
            </p>
          </div>
        )}

        {/* View past */}
        <div className="border-t border-border-light px-3 dark:border-border-dark sm:px-4">
          <Link
            href="/visitors"
            className={`inline-flex h-12 items-center gap-1.5 font-mono text-[13px] text-muted-light transition-colors hover:text-primary-light dark:text-muted-dark dark:hover:text-primary-dark sm:text-[14px] ${FOCUS}`}
          >
            <LinkBody
              label="View past visitors"
              icon={<span aria-hidden="true">→</span>}
              spinnerClass="w-4 h-4"
              iconAfter
            />
          </Link>
        </div>
      </div>
    </>
  )
}
