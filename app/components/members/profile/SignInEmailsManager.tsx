'use client'

import { useState, useTransition } from 'react'
import { useSession } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, AlertCircle, Check, Mail } from 'lucide-react'
import { addUserEmail } from '@/app/lib/actions/user/addUserEmail'
import { removeUserEmail } from '@/app/lib/actions/user/removeUserEmail'
import type { UserEmailItem } from '@/types/user.types'

export default function SignInEmailsManager({
  initialEmails,
  primaryEmail
}: {
  initialEmails: UserEmailItem[]
  primaryEmail: string
}) {
  const { data: session } = useSession()
  const currentEmail = session?.user?.signInEmail?.toLowerCase() ?? null

  const [emails, setEmails] = useState(initialEmails)
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const primaryIsSignIn = emails.some((e) => e.email.toLowerCase() === primaryEmail.toLowerCase())

  function handleAdd(value?: string) {
    const raw = (value ?? input).trim()
    if (!raw || pending) return

    setError(null)
    setNotice(null)

    startTransition(async () => {
      const res = await addUserEmail(raw)
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
          ? 'Added. This only works if that domain is on Google Workspace.'
          : 'Added. You can sign in with that account now.'
      )
      setTimeout(() => setNotice(null), 5000)
    })
  }

  function handleRemove(id: string) {
    setError(null)
    setNotice(null)
    setRemovingId(id)

    startTransition(async () => {
      const res = await removeUserEmail(id)
      setRemovingId(null)
      if (!res.success) {
        setError(res.error ?? 'Could not remove that email.')
        return
      }
      setEmails((prev) => prev.filter((e) => e.id !== id))
    })
  }

  return (
    <div className="mb-6">
      {/* Section label */}
      <div className="flex items-center gap-3 mb-2">
        <span className="block w-5 h-px bg-primary-light dark:bg-primary-dark shrink-0" aria-hidden="true" />
        <p className="text-f10 font-mono tracking-[0.2em] uppercase text-primary-light dark:text-primary-dark">
          Sign-In Accounts
        </p>
      </div>

      <p className="text-[12.5px] font-nunito text-muted-light dark:text-muted-dark leading-relaxed mb-4">
        You sign in to CORE with Google. Add every Google account you might use — personal, work, whichever your browser
        happens to default to. Any of them will get you in.
      </p>

      {/* Email list */}
      <div className="flex flex-col gap-2 mb-4">
        <AnimatePresence initial={false}>
          {emails.map((e) => {
            const isCurrent = currentEmail === e.email.toLowerCase()
            const isPrimary = e.email.toLowerCase() === primaryEmail.toLowerCase()

            return (
              <motion.div
                key={e.id}
                layout
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.18 }}
                className={`border px-4 py-3 flex items-center gap-3 ${
                  isCurrent
                    ? 'border-primary-light/40 dark:border-primary-dark/40 bg-primary-light/5 dark:bg-primary-dark/5'
                    : 'border-border-light dark:border-border-dark'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    isCurrent ? 'bg-primary-light dark:bg-primary-dark' : 'bg-emerald-500 dark:bg-emerald-400'
                  }`}
                  aria-hidden="true"
                />

                <div className="flex-1 min-w-0">
                  <p className="font-mono text-[13px] text-text-light dark:text-text-dark truncate">{e.email}</p>
                  <p className="text-f10 font-mono tracking-widest uppercase text-muted-light dark:text-muted-dark mt-0.5">
                    {isCurrent && 'Signed in now'}
                    {isCurrent && isPrimary && ' · '}
                    {isPrimary && 'Display email'}
                    {!isCurrent &&
                      !isPrimary &&
                      `Added ${new Date(e.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}`}
                  </p>
                </div>

                <button
                  onClick={() => handleRemove(e.id)}
                  disabled={pending || isCurrent || emails.length <= 1}
                  title={
                    isCurrent
                      ? "You're signed in with this account — switch to another before removing it"
                      : emails.length <= 1
                        ? 'You need at least one sign-in account'
                        : 'Remove'
                  }
                  className="shrink-0 w-8 h-8 flex items-center justify-center border border-border-light dark:border-border-dark text-muted-light dark:text-muted-dark hover:border-red-300 dark:hover:border-red-400/40 hover:text-red-500 dark:hover:text-red-400 transition-colors disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:border-border-light dark:disabled:hover:border-border-dark disabled:hover:text-muted-light dark:disabled:hover:text-muted-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
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
            )
          })}
        </AnimatePresence>

        {emails.length === 0 && (
          <div className="border border-amber-200 dark:border-amber-400/25 bg-amber-50 dark:bg-amber-400/5 px-4 py-4">
            <p className="text-[12.5px] font-nunito text-amber-800 dark:text-amber-300 leading-relaxed">
              No sign-in accounts yet. Add a Google account below so you can get back in next time.
            </p>
          </div>
        )}
      </div>

      {/* Add display email as sign-in */}
      {!primaryIsSignIn && (
        <button
          onClick={() => handleAdd(primaryEmail)}
          disabled={pending}
          className="w-full mb-3 px-4 py-3 border border-dashed border-border-light dark:border-border-dark text-left hover:border-primary-light dark:hover:border-primary-dark transition-colors disabled:opacity-40 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark"
        >
          <div className="flex items-center gap-3">
            <Mail
              size={13}
              className="text-muted-light dark:text-muted-dark group-hover:text-primary-light dark:group-hover:text-primary-dark transition-colors shrink-0"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="font-mono text-[12.5px] text-text-light dark:text-text-dark truncate">{primaryEmail}</p>
              <p className="text-f10 font-mono tracking-widest uppercase text-muted-light dark:text-muted-dark mt-0.5">
                Use display email to sign in
              </p>
            </div>
          </div>
        </button>
      )}

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
          placeholder="you@gmail.com"
          autoCapitalize="off"
          autoComplete="off"
          spellCheck={false}
          disabled={pending}
          className="flex-1 h-12 px-3.5 bg-white dark:bg-bg-dark border border-border-light dark:border-border-dark font-mono text-[13px] text-text-light dark:text-text-dark placeholder:text-muted-light dark:placeholder:text-muted-dark focus:outline-none focus:border-primary-light dark:focus:border-primary-dark transition-colors rounded-none"
        />
        <button
          onClick={() => handleAdd()}
          disabled={pending || !input.trim()}
          className="shrink-0 h-12 px-5 bg-primary-light dark:bg-button-dark text-white font-sora font-bold text-sm inline-flex items-center gap-1.5 hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark"
        >
          <Plus size={14} aria-hidden="true" />
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
