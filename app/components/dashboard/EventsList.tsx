'use client'

import { TEvent } from '@/types/event'
import { ExternalLink } from 'lucide-react'

const ORG_LABELS: Record<string, string> = {
  LYNN_CHAMBER: 'Lynn Chamber',
  NORTH_SHORE_LATINO: 'NS Latino Business',
  BOYS_AND_GIRLS_CLUB: 'Boys & GIrls Club'
}

function MarqueeContent({ event }: { event: TEvent }) {
  const inner = (
    <span className="flex items-center gap-4 px-8 shrink-0">
      <span className="text-f10 font-mono tracking-widest uppercase text-primary-light dark:text-primary-dark">
        {ORG_LABELS[event.org] ?? event.org}
      </span>
      <span aria-hidden="true">·</span>
      <span className="text-[13px] font-sora font-bold text-text-light dark:text-text-dark">{event.name}</span>
      {event.description && (
        <>
          <span aria-hidden="true">·</span>
          <span className="text-[12px] font-nunito text-muted-light dark:text-muted-dark">{event.description}</span>
        </>
      )}
    </span>
  )

  return (
    <div className="overflow-hidden w-full">
      <div className="animate-marquee">
        {inner}
        {inner}
      </div>
    </div>
  )
}

export function EventsList({ events }: { events: TEvent[] }) {
  if (!events.length) return null

  return (
    <ul className="border border-border-light dark:border-border-dark divide-y divide-border-light dark:divide-border-dark">
      {events
        .filter((e) => e.status === 'UPCOMING')
        .map((event) => (
          <li key={event.id} className="overflow-hidden">
            {event.externalLink ? (
              <a
                href={event.externalLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-3 hover:bg-surface-light dark:hover:bg-surface-dark transition-colors"
              >
                <div className="flex-1 min-w-0 overflow-hidden">
                  <MarqueeContent event={event} />
                </div>
                <ExternalLink
                  size={11}
                  className="text-primary-light dark:text-primary-dark shrink-0"
                  aria-hidden="true"
                />
              </a>
            ) : (
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0 overflow-hidden">
                  <MarqueeContent event={event} />
                </div>
              </div>
            )}
          </li>
        ))}
    </ul>
  )
}
