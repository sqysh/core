'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { fmtDate } from '@/app/components/PresentersSchedule'

interface TVisitor {
  id: string
  firstName: string
  lastName: string
  email: string
  company: string
  industry: string
  visitDate: string
  invitedBy: { name: string } | null
}

interface TVisitorDay {
  id: string
  date: string
  presenterName?: string | null
  presenterCompany?: string | null
}

interface VisitorsClientProps {
  visitorDays: TVisitorDay[]
  visitors: TVisitor[]
}

function VisitorRow({ visitor, index }: { visitor: TVisitor; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, delay: index * 0.03 }}
      className="flex items-center gap-3 px-4 py-3 border-b border-border-light dark:border-border-dark last:border-b-0"
    >
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-sora font-semibold text-text-light dark:text-text-dark leading-tight truncate">
          {visitor.firstName} {visitor.lastName}
        </p>
        <p className="text-f10 font-mono text-muted-light dark:text-muted-dark truncate mt-0.5">
          {visitor.company} · {visitor.industry}
        </p>
      </div>
      {visitor.invitedBy && (
        <p className="text-f10 font-mono tracking-widest uppercase text-muted-light dark:text-muted-dark shrink-0">
          via {visitor.invitedBy.name.split(' ')[0]}
        </p>
      )}
    </motion.div>
  )
}

export default function VisitorsClient({ visitorDays, visitors }: VisitorsClientProps) {
  // Group visitors by visitDate
  const grouped = visitorDays.map((day) => {
    const dayKey = day.date.slice(0, 10)
    const dayVisitors = visitors.filter((v) => v.visitDate.slice(0, 10) === dayKey)
    return { day, visitors: dayVisitors }
  })

  // Also catch visitors not matched to a known visitor day
  const knownDates = new Set(visitorDays.map((d) => d.date.slice(0, 10)))
  const ungrouped = visitors.filter((v) => !knownDates.has(v.visitDate.slice(0, 10)))

  const totalVisitors = visitors.length

  return (
    <div className="min-h-screen bg-bg-light dark:bg-bg-dark">
      <main className="max-w-170 mx-auto px-4 pb-12">
        {/* ── Header ── */}
        <div className="pt-7 pb-5 border-b border-border-light dark:border-border-dark">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-f10 font-mono tracking-widest uppercase text-muted-light dark:text-muted-dark hover:text-primary-light dark:hover:text-primary-dark transition-colors mb-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark"
          >
            <ArrowLeft size={11} />
            Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <span className="block w-5 h-px bg-primary-light dark:bg-primary-dark shrink-0" aria-hidden="true" />
            <p className="text-f10 font-mono tracking-[0.2em] uppercase text-primary-light dark:text-primary-dark">
              CORE
            </p>
          </div>
          <h1 className="font-sora font-black text-3xl text-text-light dark:text-text-dark tracking-tight mt-1">
            Visitor Days
          </h1>
          <p className="font-nunito text-sm text-muted-light dark:text-muted-dark mt-1">
            {totalVisitors} {totalVisitors === 1 ? 'visitor' : 'visitors'} across {visitorDays.length}{' '}
            {visitorDays.length === 1 ? 'day' : 'days'}
          </p>
        </div>

        {/* ── Grouped visitor days ── */}
        <div className="pt-6 flex flex-col gap-6">
          {grouped.length === 0 && ungrouped.length === 0 && (
            <p className="font-nunito text-sm text-muted-light dark:text-muted-dark py-8 text-center">
              No visitor days yet.
            </p>
          )}

          {grouped.map(({ day, visitors: dayVisitors }, i) => (
            <motion.div
              key={day.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className="border border-border-light dark:border-border-dark"
            >
              {/* Day header */}
              <div className="px-4 py-3 border-b border-border-light dark:border-border-dark flex items-start justify-between gap-3">
                <div>
                  <p className="font-sora font-bold text-[13px] text-text-light dark:text-text-dark leading-tight">
                    {fmtDate(day.date)}
                  </p>
                  {day.presenterName && (
                    <p className="text-f10 font-mono text-muted-light dark:text-muted-dark mt-0.5">
                      {day.presenterName}
                      {day.presenterCompany && ` · ${day.presenterCompany}`}
                    </p>
                  )}
                </div>
                <span className="text-f10 font-mono tracking-widest uppercase text-muted-light dark:text-muted-dark shrink-0">
                  {dayVisitors.length} {dayVisitors.length === 1 ? 'visitor' : 'visitors'}
                </span>
              </div>

              {/* Visitors */}
              {dayVisitors.length === 0 ? (
                <div className="px-4 py-3">
                  <p className="text-xs font-nunito text-muted-light dark:text-muted-dark">
                    No visitors logged for this day.
                  </p>
                </div>
              ) : (
                <div>
                  {dayVisitors.map((v, vi) => (
                    <VisitorRow key={v.id} visitor={v} index={vi} />
                  ))}
                </div>
              )}
            </motion.div>
          ))}

          {/* Ungrouped visitors — visitDate didn't match a VisitorDay */}
          {ungrouped.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="border border-border-light dark:border-border-dark"
            >
              <div className="px-4 py-3 border-b border-border-light dark:border-border-dark">
                <p className="font-sora font-bold text-[13px] text-text-light dark:text-text-dark">Other Visitors</p>
              </div>
              {ungrouped.map((v, vi) => (
                <VisitorRow key={v.id} visitor={v} index={vi} />
              ))}
            </motion.div>
          )}
        </div>
      </main>
    </div>
  )
}
