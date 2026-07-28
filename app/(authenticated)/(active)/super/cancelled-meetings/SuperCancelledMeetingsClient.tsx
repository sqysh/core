'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CalendarX, Plus, RotateCcw } from 'lucide-react'
import { cancelMeeting } from '@/lib/actions/cancelled-meeting/cancel-meeting'
import { restoreMeeting } from '@/lib/actions/cancelled-meeting/restoreMeeting'
import { fmtDate, toDateKey } from '@/lib/utils/date.utils'
import { getUpcomingMeetingDates } from '@/lib/utils/presenter-engine.utils'

// ─── Types ───────────────────────────────────────────────────────────────────
interface CancelledMeeting {
  id: string
  date: string
  reason: string | null
}

// ─── Main ────────────────────────────────────────────────────────────────────
export function SuperCancelledMeetingsClient({
  cancelledMeetings: initial
}: {
  cancelledMeetings: CancelledMeeting[]
}) {
  const [cancelled, setCancelled] = useState(initial)
  const [showAdd, setShowAdd] = useState(false)
  const [selectedDate, setSelectedDate] = useState('')
  const [reason, setReason] = useState('')
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const upcomingDates = getUpcomingMeetingDates([], [], 23)
  const cancelledSet = new Set(cancelled?.map((c) => c.date.slice(0, 10)))
  const availableDates = upcomingDates.filter((d) => !cancelledSet.has(d))

  async function handleCancel() {
    if (!selectedDate) return
    const res = await cancelMeeting({ date: selectedDate, reason })
    if (res.success) {
      setCancelled((prev) =>
        [
          ...prev,
          { id: 'optimistic-' + selectedDate, date: new Date(selectedDate).toISOString(), reason: reason || null }
        ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      )
      setSelectedDate('')
      setReason('')
      setShowAdd(false)
    }
  }

  async function handleRestore(id: string) {
    setLoadingId(id)
    const res = await restoreMeeting(id)
    if (res.success) setCancelled((prev) => prev.filter((c) => c.id !== id))
    setLoadingId(null)
  }

  return (
    <div className="p-6">
      {/* ── Page header ── */}
      <div className="mb-6 flex items-baseline justify-between">
        <div>
          <p className="text-[10px] font-mono tracking-[0.2em] uppercase text-primary-light dark:text-primary-dark mb-1">
            Super · Admin
          </p>
          <h1 className="font-sora font-black text-[26px] text-text-light dark:text-text-dark tracking-tight">
            Cancelled Meetings
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono text-on-dark">{cancelled.length} cancelled</span>
          <button
            onClick={() => setShowAdd((v) => !v)}
            className="flex items-center gap-1.5 h-7 px-3 border border-border-light dark:border-border-dark text-muted-light dark:text-muted-dark hover:border-primary-light dark:hover:border-primary-dark hover:text-primary-light dark:hover:text-primary-dark transition-colors text-[10px] font-mono tracking-[0.15em] uppercase"
          >
            <Plus size={11} aria-hidden="true" />
            Cancel Meeting
          </button>
        </div>
      </div>

      {/* ── Add form ── */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-4"
          >
            <div className="border border-border-light dark:border-border-dark">
              <div className="px-4 py-2.5 bg-bg-light dark:bg-bg-dark border-b border-border-light dark:border-border-dark">
                <span className="text-[9.5px] font-mono tracking-[0.15em] uppercase text-on-dark">
                  Cancel a Meeting
                </span>
              </div>
              <div className="px-4 py-4 bg-surface-light dark:bg-surface-dark flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="cancel-date"
                    className="text-[9.5px] font-mono tracking-[0.15em] uppercase text-muted-light dark:text-muted-dark"
                  >
                    Select Thursday
                  </label>
                  <select
                    id="cancel-date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full h-10 bg-white dark:bg-bg-dark border border-border-light dark:border-border-dark px-3.5 font-nunito text-[13px] text-text-light dark:text-text-dark focus:outline-none focus:border-primary-light dark:focus:border-primary-dark transition-colors appearance-none cursor-pointer"
                  >
                    <option value="" disabled>
                      Select a date…
                    </option>
                    {availableDates.map((d) => (
                      <option key={d} value={d}>
                        {(() => {
                          const [y, m, day] = d.split('-').map(Number)
                          return new Date(y, m - 1, day).toLocaleDateString('en-US', {
                            weekday: 'long',
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric'
                          })
                        })()}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="cancel-reason"
                    className="text-[9.5px] font-mono tracking-[0.15em] uppercase text-muted-light dark:text-muted-dark"
                  >
                    Reason <span className="text-[9px] normal-case tracking-normal opacity-60">optional</span>
                  </label>
                  <input
                    id="cancel-reason"
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. Snow day, Holiday, Venue unavailable"
                    className="w-full h-10 bg-white dark:bg-bg-dark border border-border-light dark:border-border-dark px-3.5 font-nunito text-[13px] text-text-light dark:text-text-dark placeholder:text-muted-light/50 dark:placeholder:text-muted-dark/50 focus:outline-none focus:border-primary-light dark:focus:border-primary-dark transition-colors"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowAdd(false)
                      setSelectedDate('')
                      setReason('')
                    }}
                    className="h-9 px-4 border border-border-light dark:border-border-dark text-muted-light dark:text-muted-dark font-nunito text-sm hover:bg-bg-light dark:hover:bg-bg-dark transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={!selectedDate}
                    className="flex-1 h-9 bg-red-500 dark:bg-red-600 text-white font-sora font-bold text-sm hover:opacity-90 active:opacity-80 transition-opacity disabled:opacity-40"
                  >
                    Cancel This Meeting
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── List ── */}
      <div className="border border-border-light dark:border-border-dark overflow-hidden">
        {cancelled.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
            <CalendarX size={20} className="text-muted-light dark:text-muted-dark" aria-hidden="true" />
            <p className="text-[12.5px] font-nunito text-muted-light dark:text-muted-dark">
              No cancelled meetings — all Thursdays are active.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border-light dark:divide-border-dark">
            {cancelled.map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, delay: i * 0.03 }}
                className="flex items-center gap-3 px-4 py-3 hover:bg-surface-light dark:hover:bg-surface-dark transition-colors"
              >
                <span className="w-2 h-2 rounded-full bg-red-500 dark:bg-red-400 shrink-0" aria-hidden="true" />

                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-sora font-bold text-text-light dark:text-text-dark">
                    {fmtDate(c.date, true)}
                  </p>
                  {c.reason && (
                    <p className="text-[11.5px] font-nunito text-muted-light dark:text-muted-dark truncate">
                      {c.reason}
                    </p>
                  )}
                </div>

                <button
                  onClick={() => handleRestore(c.id)}
                  disabled={loadingId === c.id}
                  className="flex items-center gap-1.5 h-7 px-2.5 border border-border-light dark:border-border-dark text-muted-light dark:text-muted-dark hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-400 dark:hover:border-emerald-400 transition-colors text-[10px] font-mono tracking-[0.15em] uppercase disabled:opacity-40"
                  aria-label="Restore this meeting"
                >
                  <RotateCcw size={11} aria-hidden="true" />
                  Restore
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
