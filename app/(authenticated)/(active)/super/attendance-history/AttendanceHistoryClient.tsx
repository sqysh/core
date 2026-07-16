'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CalendarPlus } from 'lucide-react'
import { AttendanceMember, AttendanceRow } from '@/app/lib/actions/attendance/getAttendanceHistory'
import { MeetingRow } from '@/app/components/super-dash/MeetingRow'
import { createMeeting } from '@/app/lib/actions/meeting/createMeeting'

interface AttendanceHistoryClientProps {
  members: AttendanceMember[]
  rows: AttendanceRow[]
}

// The nearest upcoming (or today's) Thursday, as a yyyy-mm-dd string for the
// date input's default. CORE meets Thursdays, so this pre-fills the likely date.
function nextThursdayISO(): string {
  const d = new Date()
  const day = d.getDay() // 0 Sun … 4 Thu … 6 Sat
  const delta = (4 - day + 7) % 7 // days until Thursday (0 if today is Thu)
  d.setDate(d.getDate() + delta)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

export default function AttendanceHistoryClient({ members, rows }: AttendanceHistoryClientProps) {
  const router = useRouter()
  const [date, setDate] = useState(nextThursdayISO())
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function handleCreate() {
    if (!date || busy) return
    setBusy(true)
    setMsg(null)
    const res = await createMeeting(date)
    if (res.success) {
      setMsg({ ok: true, text: 'Meeting created' })
      router.refresh()
    } else {
      setMsg({ ok: false, text: res.error ?? 'Failed to create meeting' })
    }
    setBusy(false)
  }

  return (
    <div className="min-h-screen bg-bg-light dark:bg-bg-dark">
      <div className="max-w-480 mx-auto px-5 sm:px-8 pb-16">
        {/* ── Header ── */}
        <div className="pt-8 pb-6 border-b border-border-light dark:border-border-dark">
          <Link
            href="/super"
            className="inline-flex items-center gap-2 text-f10 font-mono tracking-widest uppercase text-muted-light dark:text-muted-dark hover:text-primary-light dark:hover:text-primary-dark transition-colors mb-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark"
          >
            <ArrowLeft size={11} />
            Back
          </Link>
          <div className="flex items-center gap-3">
            <span className="block w-5 h-px bg-primary-light dark:bg-primary-dark shrink-0" aria-hidden="true" />
            <p className="text-f10 font-mono tracking-[0.2em] uppercase text-primary-light dark:text-primary-dark">
              Super Dashboard
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mt-2">
            <div>
              <h1 className="font-sora font-black text-3xl text-text-light dark:text-text-dark tracking-tight">
                Attendance History
              </h1>
              <p className="font-nunito text-sm text-muted-light dark:text-muted-dark mt-1">
                {rows.length} {rows.length === 1 ? 'meeting' : 'meetings'} recorded · {members.length} active members
              </p>
            </div>

            {/* ── Create meeting (superuser tool) ── */}
            <div className="flex flex-col items-start sm:items-end gap-1.5">
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="bg-transparent border border-border-light dark:border-border-dark text-text-light dark:text-text-dark font-mono text-xs px-3 py-2 focus:outline-none focus:border-primary-light dark:focus:border-primary-dark"
                />
                <button
                  onClick={handleCreate}
                  disabled={busy || !date}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-primary-light dark:border-primary-dark text-primary-light dark:text-primary-dark font-mono text-f10 tracking-widest uppercase hover:bg-primary-light hover:text-bg-light dark:hover:bg-primary-dark dark:hover:text-bg-dark transition-colors disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark"
                >
                  <CalendarPlus size={12} aria-hidden="true" />
                  {busy ? 'Creating…' : 'Create Meeting'}
                </button>
              </div>
              {msg && (
                <span
                  className={`text-f10 font-mono ${
                    msg.ok ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'
                  }`}
                >
                  {msg.text}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Member legend ── */}
        <div className="py-4 border-b border-border-light dark:border-border-dark">
          <div className="flex flex-wrap gap-2">
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-1.5">
                <span className="text-f10 font-mono text-muted-light dark:text-muted-dark">{m.name.split(' ')[0]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Attendance rows ── */}
        {rows.length === 0 ? (
          <div className="py-16 text-center">
            <p className="font-nunito text-sm text-muted-light dark:text-muted-dark">
              No meetings recorded yet. First check-in will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border-light dark:divide-border-dark">
            {rows.map((row, i) => (
              <MeetingRow key={i} members={members} index={i} row={row} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
