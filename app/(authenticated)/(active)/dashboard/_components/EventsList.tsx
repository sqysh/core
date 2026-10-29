'use client'

import { TEvent } from '@/types/event.types'
import { ExternalLink } from 'lucide-react'
import Link from 'next/link'

const ORG_LABELS: Record<string, string> = {
  LYNN_CHAMBER: 'Lynn Chamber',
  NORTH_SHORE_LATINO: 'NS Latino Business',
  BOYS_AND_GIRLS_CLUB: 'Boys & Girls Club'
}

function EventContent({ event }: { event: TEvent }) {
  return (
    <div className="min-w-0">
      <p className="text-f10 font-mono tracking-[0.12em] uppercase text-primary-light dark:text-primary-dark">
        {ORG_LABELS[event.org] ?? event.org}
      </p>
      <p className="text-[16px] font-sora font-bold text-text-light dark:text-text-dark mt-1">{event.name}</p>
      {event.description && (
        <p className="text-[14px] font-nunito text-muted-light dark:text-muted-dark mt-0.5">{event.description}</p>
      )}
    </div>
  )
}

export function EventsList({ events }: { events: TEvent[] }) {
  const upcoming = events.filter((e) => e.status === 'UPCOMING')
  if (!upcoming.length) return null

  return (
    <div>
      <ul className="border border-border-light dark:border-border-dark divide-y divide-border-light dark:divide-border-dark">
        {upcoming.map((event) => (
          <li key={event.id}>
            {event.externalLink ? (
              <a
                href={event.externalLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 px-4 py-4 hover:bg-surface-light dark:hover:bg-surface-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark"
              >
                <div className="flex-1 min-w-0">
                  <EventContent event={event} />
                </div>
                <ExternalLink
                  size={16}
                  className="text-primary-light dark:text-primary-dark shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            ) : (
              <div className="px-4 py-4">
                <EventContent event={event} />
              </div>
            )}
          </li>
        ))}
      </ul>
      <div className="px-4 py-3 border-t border-border-light dark:border-border-dark">
        <Link
          href="/events"
          className="text-f10 font-mono tracking-widest uppercase text-muted-light dark:text-muted-dark hover:text-primary-light dark:hover:text-primary-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark"
        >
          View Past →
        </Link>
      </div>
    </div>
  )
}
