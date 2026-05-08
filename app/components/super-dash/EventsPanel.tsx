'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { EventStatus } from '@prisma/client'
import { updateEventStatus } from '@/app/lib/actions/event/updateEventStatus'
import { Panel } from '../common/Panel'
import { SectionLabel } from '../common/SectionLabel'

interface SuperEvent {
  id: string
  name: string
  org: string
  description?: string | null
  externalLink?: string | null
  status: EventStatus
  createdAt: string
}

const STATUS_OPTIONS: { value: EventStatus; label: string; color: string }[] = [
  { value: 'UPCOMING', label: 'Upcoming', color: 'text-primary-light dark:text-primary-dark' },
  { value: 'COMPLETED', label: 'Completed', color: 'text-green-600 dark:text-green-400' },
  { value: 'CANCELLED', label: 'Cancelled', color: 'text-red-500 dark:text-red-400' }
]

function EventRow({ event, index }: { event: SuperEvent; index: number }) {
  const [status, setStatus] = useState<EventStatus>(event.status)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleStatusChange(newStatus: EventStatus) {
    setStatus(newStatus) // optimistic
    startTransition(async () => {
      const res = await updateEventStatus(event.id, newStatus)
      if (!res.success) {
        setStatus(event.status) // revert
      } else {
        router.refresh()
      }
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
      <div className="flex items-start justify-between gap-3 mb-1">
        <div className="min-w-0">
          <p className="text-[13px] font-sora font-bold text-text-light dark:text-text-dark leading-snug truncate">
            {event.name}
          </p>
          <p className="text-[11.5px] font-nunito text-muted-light dark:text-muted-dark truncate">{event.org}</p>
        </div>

        {/* Status selector */}
        <select
          value={status}
          onChange={(e) => handleStatusChange(e.target.value as EventStatus)}
          disabled={isPending}
          aria-label="Event status"
          className={`shrink-0 text-f10 font-mono tracking-widest uppercase bg-transparent border-none outline-none cursor-pointer disabled:opacity-40 ${currentOption?.color}`}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {event.description && (
        <p className="text-[11px] font-nunito text-muted-light dark:text-muted-dark leading-relaxed mt-1 line-clamp-2">
          {event.description}
        </p>
      )}
    </motion.div>
  )
}

export function EventsPanel({ events }: { events: SuperEvent[] }) {
  return (
    <Panel>
      <div className="px-4 py-3 border-b border-border-light dark:border-border-dark">
        <div className="flex items-center justify-between">
          <SectionLabel>Events</SectionLabel>
          <span className="text-f10 font-mono tracking-widest text-muted-light dark:text-muted-dark">
            {events.length} {events.length === 1 ? 'event' : 'events'}
          </span>
        </div>
      </div>

      {events.length === 0 ? (
        <p className="px-4 py-6 text-sm font-nunito text-muted-light dark:text-muted-dark text-center">No events yet</p>
      ) : (
        <div className="divide-y divide-border-light dark:divide-border-dark max-h-105 overflow-y-auto">
          {events.map((e, i) => (
            <EventRow key={e.id} event={e} index={i} />
          ))}
        </div>
      )}
    </Panel>
  )
}
