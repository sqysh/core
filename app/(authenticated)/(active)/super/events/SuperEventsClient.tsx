'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { EventStatus } from '@prisma/client'
import { updateEventStatus } from '@/app/lib/actions/event/updateEventStatus'

// ─── Types ───────────────────────────────────────────────────────────────────
interface SuperEvent {
  id: string
  name: string
  org: string
  description?: string | null
  externalLink?: string | null
  status: EventStatus
  createdAt: string
}

// ─── Constants ───────────────────────────────────────────────────────────────
const STATUS_OPTIONS: { value: EventStatus; label: string; color: string }[] = [
  { value: 'UPCOMING', label: 'Upcoming', color: 'text-primary-light dark:text-primary-dark' },
  { value: 'COMPLETED', label: 'Completed', color: 'text-green-600 dark:text-green-400' },
  { value: 'CANCELLED', label: 'Cancelled', color: 'text-red-500 dark:text-red-400' }
]

const COLS = 'grid grid-cols-[2fr_1.5fr_1fr] gap-4 px-4'
const HEADS = ['Event', 'Org', 'Status']

// ─── Sub-components ──────────────────────────────────────────────────────────
function TableHead() {
  return (
    <div className={`${COLS} py-2.5 bg-bg-light dark:bg-bg-dark border-b border-border-light dark:border-border-dark`}>
      {HEADS.map((h) => (
        <span key={h} className="text-[9.5px] font-mono tracking-[0.15em] uppercase text-on-dark">
          {h}
        </span>
      ))}
    </div>
  )
}

function EventRow({ event, index }: { event: SuperEvent; index: number }) {
  const [status, setStatus] = useState<EventStatus>(event.status)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleStatusChange(newStatus: EventStatus) {
    setStatus(newStatus)
    startTransition(async () => {
      const res = await updateEventStatus(event.id, newStatus)
      if (!res.success) setStatus(event.status)
      else router.refresh()
    })
  }

  const currentOption = STATUS_OPTIONS.find((s) => s.value === status)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: index * 0.025 }}
      className="px-4 py-3 hover:bg-surface-light dark:hover:bg-surface-dark transition-colors"
    >
      <div className={`${COLS} items-center`}>
        {/* Event name + optional description */}
        <div className="min-w-0">
          <p className="text-[13px] font-sora font-bold text-text-light dark:text-text-dark truncate">{event.name}</p>
          {event.description && (
            <p className="text-[11px] font-nunito text-muted-light dark:text-muted-dark line-clamp-1 mt-0.5">
              {event.description}
            </p>
          )}
        </div>

        {/* Org */}
        <p className="text-[12px] font-mono text-muted-light dark:text-muted-dark truncate">{event.org}</p>

        {/* Status selector */}
        <select
          value={status}
          onChange={(e) => handleStatusChange(e.target.value as EventStatus)}
          disabled={isPending}
          aria-label="Event status"
          className={`text-f10 font-mono tracking-widest uppercase bg-transparent border-none outline-none cursor-pointer disabled:opacity-40 ${currentOption?.color}`}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </motion.div>
  )
}

// ─── Main ────────────────────────────────────────────────────────────────────
export function SuperEventsClient({ events }: { events: SuperEvent[] }) {
  return (
    <div className="p-6">
      {/* ── Page header ── */}
      <div className="mb-6 flex items-baseline justify-between">
        <div>
          <p className="text-[10px] font-mono tracking-[0.2em] uppercase text-primary-light dark:text-primary-dark mb-1">
            Super · Admin
          </p>
          <h1 className="font-sora font-black text-[26px] text-text-light dark:text-text-dark tracking-tight">
            Events
          </h1>
        </div>
        <span className="text-[11px] font-mono text-on-dark">{events.length}</span>
      </div>

      {/* ── Table ── */}
      <div className="border border-border-light dark:border-border-dark overflow-hidden">
        {events.length === 0 ? (
          <p className="px-4 py-8 text-[12.5px] font-nunito text-muted-light dark:text-muted-dark text-center">
            No events yet
          </p>
        ) : (
          <>
            <TableHead />
            <div className="divide-y divide-border-light dark:divide-border-dark">
              {events.map((e, i) => (
                <EventRow key={e.id} event={e} index={i} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
