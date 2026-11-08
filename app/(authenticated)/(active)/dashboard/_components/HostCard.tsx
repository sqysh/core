'use client'

import Link from 'next/link'
import { Play } from 'lucide-react'
import { LinkBody } from '@/components/_shared/LinkBody'

export default function HostCard({ hostName }: { hostName: string }) {
  return (
    <div className="border border-primary-light/40 dark:border-primary-dark/40">
      <div className="px-4 pt-4 pb-3">
        <p className="text-f10 font-mono tracking-[0.12em] uppercase text-primary-light dark:text-primary-dark">
          You’re hosting today
        </p>
        <p className="mt-1 font-sora text-[18px] font-black tracking-tight text-text-light dark:text-text-dark">
          Morning, {hostName.split(' ')[0]}. The remote runs the whole meeting.
        </p>
        <p className="mt-2 font-nunito text-[14px] leading-relaxed text-muted-light dark:text-muted-dark">
          Six steps, one button each: script, shortlist, presentation, wins, matchups, close. The TV follows you.
        </p>
      </div>
      <Link
        href="/stage/remote"
        className="flex h-14 w-full items-center justify-center gap-2 bg-primary-light font-sora text-[16px] font-black text-white dark:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
      >
        <LinkBody label="Open the remote" icon={<Play size={18} aria-hidden="true" />} />
      </Link>
    </div>
  )
}
