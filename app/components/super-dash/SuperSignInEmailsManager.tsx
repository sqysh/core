'use client'

import { useState, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, AlertCircle, Check, ShieldAlert } from 'lucide-react'
import { removeMemberEmail } from '@/app/lib/actions/super-user/removeMemberEmail'
import { addMemberEmail } from '@/app/lib/actions/super-user/addMemberEmail'

export interface MemberEmail {
  id: string
  email: string
  createdAt: string
}

export default function SuperSignInEmailsManager({
  userId,
  memberName,
  primaryEmail,
  initialEmails
}: {
  userId: string
  memberName: string
  primaryEmail: string
  initialEmails: MemberEmail[]
}) {
  const [emails, setEmails] = useState(initialEmails)
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const primaryIsSignIn = emails.some((e) => e.email.toLowerCase() === primaryEmail.toLowerCase())
  const lockedOut = emails.length === 0
  const firstName = memberName.split(' ')[0]

  function handleAdd(value?: string) {
    const raw = (value ?? input).trim()
    if (!raw || pending) return

    setError(null)
    setNotice(null)

    startTransition(async () => {
      const res = await addMemberEmail(userId, raw)
      if (!res.success) {
        setError(res.error ?? 'Could not add that email.')
        return
      }
      setEmails((prev) => [
        ...prev,
        { id: crypto.randomUUID(), email: raw.toLowerCase(), createdAt: new Date().toISOString() }
      ])
      setInput('')
      setNotice(
        res.isWorkspace
          ? `Added. This only works if ${raw.split('@')[1]} is on Google Workspace.`
          : `Added. ${firstName} can sign in with this account.`
      )
      setTimeout(() => setNotice(null), 6000)
    })
  }

  function handleRemove(id: string) {
    setError(null)
    setNotice(null)
    setRemovingId(id)

    startTransition(async () => {
      const res = await removeMemberEmail(id)
      setRemovingId(null)
      if (!res.success) {
        setError(res.error ?? 'Could not remove that email.')
        return
      }
      setEmails((prev) => prev.filter((e) => e.id !== id))
    })
  }

  return (
    <div>
      {/* Section label */}
      <div className="flex items-baseline justify-between mb-3">
        <p className="text-f10 font-mono tracking-[0.2em] uppercase text-muted-light dark:text-muted-dark">
          Sign-In Accounts
        </p>
        <span className="text-[11px] font-mono text-on-dark">
          {emails.length} {emails.length === 1 ? 'account' : 'accounts'}
        </span>
      </div>

      {/* Lockout warning */}
      {lockedOut && (
        <div className="border border-red-200 dark:border-red-400/25 bg-red-50 dark:bg-red-400/5 px-4 py-3 mb-2 flex items-start gap-2.5">
          <ShieldAlert size={13} className="text-red-500 dark:text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-[12.5px] font-nunito text-red-700 dark:text-red-300 leading-relaxed">
            {firstName} cannot sign in. Google is the only way into CORE, so at least one account has to be registered
            here.
          </p>
        </div>
      )}

      {/* Display email row */}
      <div className="border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark px-4 py-3 mb-2 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-mono text-[13px] text-text-light dark:text-text-dark truncate">{primaryEmail}</p>
          <p className="text-f10 font-mono tracking-widest uppercase text-muted-light dark:text-muted-dark mt-0.5">
            {primaryIsSignIn ? 'Display email · also signs in' : 'Display email'}
          </p>
        </div>
        {!primaryIsSignIn && (
          <button
            onClick={() => handleAdd(primaryEmail)}
            disabled={pending}
            className="shrink-0 text-f10 font-mono tracking-widest uppercase px-2.5 py-1.5 border border-border-light dark:border-border-dark text-muted-light dark:text-muted-dark hover:border-primary-light dark:hover:border-primary-dark hover:text-primary-light dark:hover:text-primary-dark transition-colors disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark"
          >
            Add as sign-in
          </button>
        )}
      </div>

      {/* Registered emails */}
      <div className="flex flex-col gap-2 mb-3">
        <AnimatePresence initial={false}>
          {emails.map((e) => (
            <motion.div
              key={e.id}
              layout
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.18 }}
              className="border border-border-light dark:border-border-dark px-4 py-3 flex items-center gap-3"
            >
              <span
                className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 shrink-0"
                aria-hidden="true"
              />
              <div className="flex-1 min-w-0">
                <p className="font-mono text-[13px] text-text-light dark:text-text-dark truncate">{e.email}</p>
                <p className="text-f10 font-mono text-muted-light dark:text-muted-dark mt-0.5">
                  Added{' '}
                  {new Date(e.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </p>
              </div>
              <button
                onClick={() => handleRemove(e.id)}
                disabled={pending}
                title={emails.length === 1 ? `Removing this locks ${firstName} out` : 'Remove'}
                className="shrink-0 w-8 h-8 flex items-center justify-center border border-border-light dark:border-border-dark text-muted-light dark:text-muted-dark hover:border-red-300 dark:hover:border-red-400/40 hover:text-red-500 dark:hover:text-red-400 transition-colors disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
              >
                {removingId === e.id ? (
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-3 h-3 border border-current border-t-transparent rounded-full"
                    aria-hidden="true"
                  />
                ) : (
                  <X size={13} aria-hidden="true" />
                )}
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Add form */}
      <div className="flex items-stretch gap-2">
        <input
          type="email"
          value={input}
          onChange={(ev) => {
            setInput(ev.target.value)
            setError(null)
          }}
          onKeyDown={(ev) => ev.key === 'Enter' && handleAdd()}
          placeholder="member@gmail.com"
          autoCapitalize="off"
          autoComplete="off"
          spellCheck={false}
          disabled={pending}
          className="flex-1 h-11 px-3.5 bg-white dark:bg-bg-dark border border-border-light dark:border-border-dark font-mono text-[13px] text-text-light dark:text-text-dark placeholder:text-muted-light dark:placeholder:text-muted-dark focus:outline-none focus:border-primary-light dark:focus:border-primary-dark transition-colors rounded-none"
        />
        <button
          onClick={() => handleAdd()}
          disabled={pending || !input.trim()}
          className="shrink-0 h-11 px-4 bg-primary-light dark:bg-button-dark text-white font-sora font-bold text-[13px] inline-flex items-center gap-1.5 hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark"
        >
          <Plus size={13} aria-hidden="true" />
          Add
        </button>
      </div>

      {/* Feedback */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-3 border-l-2 border-red-500 bg-red-50 dark:bg-red-400/5 px-4 py-2.5"
            role="alert"
          >
            <p className="flex items-center gap-1.5 text-[12.5px] font-nunito text-red-700 dark:text-red-300">
              <AlertCircle size={12} className="shrink-0" aria-hidden="true" />
              {error}
            </p>
          </motion.div>
        )}
        {notice && !error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-3 border-l-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-400/5 px-4 py-2.5"
          >
            <p className="flex items-center gap-1.5 text-[12.5px] font-nunito text-emerald-700 dark:text-emerald-300">
              <Check size={12} className="shrink-0" aria-hidden="true" />
              {notice}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
