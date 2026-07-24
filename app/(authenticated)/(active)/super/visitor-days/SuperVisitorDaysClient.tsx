'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, ChevronDown, ChevronUp } from 'lucide-react'
import { getUpcomingMeetingDates } from '@/app/lib/utils/presenter-engine.utils'
import { toDateKey, fmtDate } from '@/app/lib/utils/date.utils'
import { addVisitorDay } from '@/app/lib/actions/visitor-day/addVisitorDay'
import { removeVisitorDay } from '@/app/lib/actions/visitor-day/removeVisitorDay'
import { updateVisitorDay } from '@/app/lib/actions/visitor-day/updateVisitorDay'

// ─── Types ───────────────────────────────────────────────────────────────────
interface VisitorDay {
  id: string
  date: string
  presenterName?: string | null
  presenterCompany?: string | null
}

interface Props {
  visitorDays: VisitorDay[]
  cancelledDates: string[]
}

// ─── Edit Row ────────────────────────────────────────────────────────────────
function EditRow({
  visitorDay,
  onSave,
  onCancel
}: {
  visitorDay: VisitorDay
  onSave: (id: string, presenterName: string, presenterCompany: string) => Promise<void>
  onCancel: () => void
}) {
  const [presenterName, setPresenterName] = useState(visitorDay.presenterName ?? '')
  const [presenterCompany, setPresenterCompany] = useState(visitorDay.presenterCompany ?? '')
  const [saving, setSaving] = useState(false)

  const inputCls =
    'w-full h-9 bg-white dark:bg-bg-dark border border-border-light dark:border-border-dark px-3 font-nunito text-[13px] text-text-light dark:text-text-dark placeholder:text-muted-light/50 dark:placeholder:text-muted-dark/50 focus:outline-none focus:border-primary-light dark:focus:border-primary-dark transition-colors'

  async function handleSave() {
    setSaving(true)
    await onSave(visitorDay.id, presenterName, presenterCompany)
    setSaving(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden border-t border-border-light dark:border-border-dark"
    >
      <div className="px-4 py-3 bg-surface-light dark:bg-surface-dark flex flex-col gap-2.5">
        <div className="flex flex-col gap-1">
          <label className="text-f10 font-mono tracking-[0.18em] uppercase text-muted-light dark:text-muted-dark">
            Presenter Name
          </label>
          <input
            type="text"
            value={presenterName}
            onChange={(e) => setPresenterName(e.target.value)}
            placeholder="Jane Smith"
            className={inputCls}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-f10 font-mono tracking-[0.18em] uppercase text-muted-light dark:text-muted-dark">
            Presenter Company
          </label>
          <input
            type="text"
            value={presenterCompany}
            onChange={(e) => setPresenterCompany(e.target.value)}
            placeholder="Smith & Associates"
            className={inputCls}
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            disabled={saving}
            className="h-9 px-4 border border-border-light dark:border-border-dark text-muted-light dark:text-muted-dark font-nunito text-sm hover:bg-bg-light dark:hover:bg-bg-dark transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 h-9 bg-primary-light dark:bg-primary-dark text-white font-sora font-bold text-sm hover:opacity-90 active:opacity-80 transition-opacity disabled:opacity-40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Main ────────────────────────────────────────────────────────────────────
export function SuperVisitorDaysClient({ visitorDays: initial, cancelledDates }: Props) {
  const [visitorDays, setVisitorDays] = useState(initial)
  const [showAdd, setShowAdd] = useState(false)
  const [selectedDate, setSelectedDate] = useState('')
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    setVisitorDays(initial)
  }, [initial])

  const visitorSet = new Set(
    visitorDays.map((v) => {
      const d = new Date(v.date)
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    })
  )

  const upcomingDates = getUpcomingMeetingDates(cancelledDates, [], 20)
  const availableDates = upcomingDates.filter((d) => !visitorSet.has(toDateKey(new Date(d))))

  async function handleAdd() {
    if (!selectedDate) return
    const res = await addVisitorDay(selectedDate)
    if (res.success) {
      router.refresh()
      setSelectedDate('')
      setShowAdd(false)
    }
  }

  async function handleRemove(id: string) {
    setLoadingId(id)
    const res = await removeVisitorDay(id)
    if (res.success) router.refresh()
    setLoadingId(null)
  }

  async function handleUpdate(id: string, presenterName: string, presenterCompany: string) {
    const res = await updateVisitorDay({ id, presenterName, presenterCompany })
    if (res.success) {
      router.refresh()
      setEditingId(null)
    }
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
            Visitor Days
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono text-on-dark">{visitorDays.length} scheduled</span>
          <button
            onClick={() => setShowAdd((v) => !v)}
            className="flex items-center gap-1.5 h-7 px-3 border border-border-light dark:border-border-dark text-muted-light dark:text-muted-dark hover:border-primary-light dark:hover:border-primary-dark hover:text-primary-light dark:hover:text-primary-dark transition-colors text-[10px] font-mono tracking-[0.15em] uppercase"
          >
            <Plus size={11} aria-hidden="true" />
            Add
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
                <span className="text-[9.5px] font-mono tracking-[0.15em] uppercase text-on-dark">Select Thursday</span>
              </div>
              <div className="px-4 py-4 bg-surface-light dark:bg-surface-dark flex flex-col gap-3">
                <select
                  id="visitor-date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full h-10 bg-white dark:bg-bg-dark border border-border-light dark:border-border-dark px-3.5 font-nunito text-[13px] text-text-light dark:text-text-dark focus:outline-none focus:border-primary-light dark:focus:border-primary-dark transition-colors appearance-none cursor-pointer"
                >
                  <option value="" disabled>
                    Select a date…
                  </option>
                  {availableDates.map((d) => (
                    <option key={d} value={d}>
                      {new Date(d).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                        timeZone: 'America/New_York'
                      })}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowAdd(false)
                      setSelectedDate('')
                    }}
                    className="h-9 px-4 border border-border-light dark:border-border-dark text-muted-light dark:text-muted-dark font-nunito text-sm hover:bg-bg-light dark:hover:bg-bg-dark transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAdd}
                    disabled={!selectedDate}
                    className="flex-1 h-9 bg-amber-500 dark:bg-amber-600 text-white font-sora font-bold text-sm hover:opacity-90 active:opacity-80 transition-opacity disabled:opacity-40"
                  >
                    Mark as Visitor Day
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── List ── */}
      <div className="border border-border-light dark:border-border-dark overflow-hidden">
        {visitorDays.length === 0 ? (
          <p className="px-4 py-8 text-[12.5px] font-nunito text-muted-light dark:text-muted-dark text-center">
            No visitor days scheduled.
          </p>
        ) : (
          <div className="divide-y divide-border-light dark:divide-border-dark">
            {visitorDays.map((v, i) => (
              <div key={v.id}>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.03 }}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-surface-light dark:hover:bg-surface-dark transition-colors"
                >
                  <span className="w-2 h-2 rounded-full bg-amber-500 dark:bg-amber-400 shrink-0" aria-hidden="true" />

                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-sora font-bold text-text-light dark:text-text-dark">
                      {fmtDate(v.date)}
                    </p>
                    {(v.presenterName || v.presenterCompany) && (
                      <p className="text-[11.5px] font-nunito text-muted-light dark:text-muted-dark truncate mt-0.5">
                        {v.presenterName}
                        {v.presenterName && v.presenterCompany && ' · '}
                        {v.presenterCompany}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => setEditingId(editingId === v.id ? null : v.id)}
                    aria-label="Edit presenter"
                    className="w-6 h-6 flex items-center justify-center text-muted-light dark:text-muted-dark hover:text-primary-light dark:hover:text-primary-dark transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark"
                  >
                    {editingId === v.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>

                  <button
                    onClick={() => handleRemove(v.id)}
                    disabled={loadingId === v.id}
                    aria-label="Remove visitor day"
                    className="w-6 h-6 flex items-center justify-center text-muted-light dark:text-muted-dark hover:text-red-500 dark:hover:text-red-400 disabled:opacity-40 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark"
                  >
                    <X size={12} />
                  </button>
                </motion.div>

                <AnimatePresence>
                  {editingId === v.id && (
                    <EditRow visitorDay={v} onSave={handleUpdate} onCancel={() => setEditingId(null)} />
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
