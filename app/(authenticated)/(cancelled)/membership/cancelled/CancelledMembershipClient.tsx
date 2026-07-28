'use client'

import { useState } from 'react'
import { signOut } from 'next-auth/react'
import { motion } from 'framer-motion'
import { Download, LogOut, AlertCircle, Calendar, FileDown, Check } from 'lucide-react'
import { useSounds } from '@/lib/hooks/useSounds'
import { exportUserData } from '@/lib/actions/user/exportUserData'

function fmtFullDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })
}

function daysUntil(iso: string): number {
  const target = new Date(iso).getTime()
  const now = new Date().getTime()
  return Math.max(0, Math.ceil((target - now) / (1000 * 60 * 60 * 24)))
}

export function CancelledMembershipClient({
  userName,
  userEmail,
  accessEndsAt
}: {
  userName: string
  userEmail: string
  accessEndsAt: string | null
}) {
  const [downloading, setDownloading] = useState(false)
  const [downloaded, setDownloaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { play } = useSounds({ enabled: true })

  const days = accessEndsAt ? daysUntil(accessEndsAt) : null

  async function handleDownload() {
    setDownloading(true)
    setError(null)
    try {
      const result = await exportUserData()
      if (!result.success || !result.data) {
        setError(result.error ?? 'Unable to prepare your data right now. Please try again.')
        setDownloading(false)
        return
      }

      // Trigger browser download
      const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `core-data-${userEmail.split('@')[0]}-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      play('se9')
      setDownloaded(true)
    } catch (err) {
      console.error('Data export failed:', err)
      setError('Unable to prepare your data right now. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <main className="min-h-screen bg-bg-light dark:bg-bg-dark flex items-start sm:items-center justify-center px-4 py-10 sm:py-16">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-2xl border border-border-light dark:border-border-dark bg-bg-light dark:bg-surface-dark"
      >
        {/* Header */}
        <div className="px-5 sm:px-7 py-5 sm:py-6 border-b border-border-light dark:border-border-dark">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle size={14} className="text-amber-500 dark:text-amber-400 shrink-0" aria-hidden="true" />
            <p className="text-[10px] sm:text-f10 font-mono tracking-[0.2em] uppercase text-amber-700 dark:text-amber-400 font-bold">
              Membership Cancelled
            </p>
          </div>
          <h1 className="font-sora font-black text-2xl sm:text-3xl text-text-light dark:text-text-dark leading-tight tracking-tight">
            We're sorry to see you go, {userName.split(' ')[0]}.
          </h1>
          <p className="font-nunito text-sm sm:text-base text-muted-light dark:text-muted-dark mt-3 leading-relaxed">
            Your CORE membership has been cancelled. Your data is safe and ready for you to download before your access
            ends.
          </p>
        </div>

        {/* What happens next */}
        <div className="px-5 sm:px-7 py-5 sm:py-6 space-y-5 border-b border-border-light dark:border-border-dark">
          <div>
            <p className="text-[10px] sm:text-f10 font-mono tracking-[0.2em] uppercase text-primary-light dark:text-primary-dark mb-3 font-bold">
              What Happens Next
            </p>

            <ul className="space-y-3">
              {[
                {
                  title: 'You can still download your data',
                  body: 'A full export of your CORE history — referrals, attendance, face-to-face meetings, thank-yous, and visitor records — is available below for as long as you have access.'
                },
                {
                  title: 'Dashboard access ends after your current billing period',
                  body: accessEndsAt
                    ? `You'll lose access to your member dashboard on ${fmtFullDate(accessEndsAt)}${
                        days !== null ? ` — that's ${days} day${days === 1 ? '' : 's'} from now.` : '.'
                      } Until then, you can return to this page anytime by signing in.`
                    : "You'll lose access to your member dashboard once your current billing period ends. Until then, you can return to this page anytime by signing in."
                },
                {
                  title: 'No further charges',
                  body: "Your annual admission and quarterly room dues won't renew. You won't be charged again unless you reactivate your membership."
                },
                {
                  title: 'You can come back anytime',
                  body: 'If you change your mind, your spot in the chapter can be re-activated. Reach out to your chapter leadership or contact us directly.'
                }
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="shrink-0 mt-0.5 w-5 h-5 border border-border-light dark:border-border-dark bg-bg-light dark:bg-surface-dark flex items-center justify-center text-[10px] font-mono font-bold text-primary-light dark:text-primary-dark">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] sm:text-sm font-sora font-bold text-text-light dark:text-text-dark leading-tight">
                      {item.title}
                    </p>
                    <p className="text-[12px] sm:text-[13px] font-nunito text-muted-light dark:text-muted-dark leading-relaxed mt-1">
                      {item.body}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Stat strip */}
        {accessEndsAt && (
          <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 px-5 sm:px-7 py-5 border-b border-border-light dark:border-border-dark">
            <div className="border border-border-light dark:border-border-dark bg-bg-light dark:bg-surface-dark p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Calendar size={11} className="text-muted-light dark:text-muted-dark shrink-0" aria-hidden="true" />
                <p className="text-[9px] sm:text-f10 font-mono tracking-[0.15em] uppercase text-muted-light dark:text-muted-dark">
                  Access Ends
                </p>
              </div>
              <p className="font-sora font-black text-sm text-text-light dark:text-text-dark leading-tight">
                {fmtFullDate(accessEndsAt)}
              </p>
            </div>
            <div className="border border-border-light dark:border-border-dark bg-bg-light dark:bg-surface-dark p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <FileDown size={11} className="text-muted-light dark:text-muted-dark shrink-0" aria-hidden="true" />
                <p className="text-[9px] sm:text-f10 font-mono tracking-[0.15em] uppercase text-muted-light dark:text-muted-dark">
                  Time Remaining
                </p>
              </div>
              <p className="font-sora font-black text-sm text-text-light dark:text-text-dark leading-tight">
                {days} day{days === 1 ? '' : 's'}
              </p>
            </div>
          </div>
        )}

        {/* Download CTA */}
        <div className="px-5 sm:px-7 py-5 sm:py-6 border-b border-border-light dark:border-border-dark">
          <p className="text-[10px] sm:text-f10 font-mono tracking-[0.2em] uppercase text-primary-light dark:text-primary-dark mb-3 font-bold">
            Your Data
          </p>
          <p className="text-[13px] sm:text-sm font-nunito text-muted-light dark:text-muted-dark leading-relaxed mb-4">
            Download a complete copy of everything you've contributed to CORE. The file includes your profile,
            attendance history, referrals given and received, face-to-face meetings, thank-yous, and visitor records.
          </p>

          {error && (
            <div className="mb-3 px-3 py-2 border border-red-500/40 dark:border-red-400/40 bg-red-500/5 dark:bg-red-400/5">
              <p className="text-[12px] font-nunito text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <button
            onClick={handleDownload}
            disabled={downloading}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 border border-primary-light dark:border-primary-dark bg-primary-light dark:bg-primary-dark text-bg-light dark:text-bg-dark text-[10px] sm:text-f10 font-mono tracking-[0.2em] uppercase font-bold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark"
          >
            {downloaded ? (
              <>
                <Check size={13} aria-hidden="true" />
                Downloaded · Get Another Copy
              </>
            ) : downloading ? (
              <>
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-3 h-3 border border-bg-light dark:border-bg-dark border-t-transparent rounded-full"
                  aria-hidden="true"
                />
                Preparing Your Data…
              </>
            ) : (
              <>
                <Download size={13} aria-hidden="true" />
                Download My Data (JSON)
              </>
            )}
          </button>
        </div>

        {/* Sign out footer */}
        <div className="px-5 sm:px-7 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-[11px] font-nunito text-muted-light dark:text-muted-dark leading-relaxed">
            Signed in as <span className="font-mono text-text-light dark:text-text-dark">{userEmail}</span>
          </p>
          <button
            onClick={() => signOut({ redirectTo: '/' })}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 border border-border-light dark:border-border-dark text-text-light dark:text-text-dark text-[10px] sm:text-f10 font-mono tracking-[0.2em] uppercase font-bold hover:border-primary-light dark:hover:border-primary-dark hover:text-primary-light dark:hover:text-primary-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark"
          >
            <LogOut size={11} aria-hidden="true" />
            Sign Out
          </button>
        </div>
      </motion.div>
    </main>
  )
}
