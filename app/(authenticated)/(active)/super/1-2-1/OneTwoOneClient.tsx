'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { fmtDate, timeAgo } from '@/lib/utils/date.utils'
import { useRouter } from 'next/navigation'
import { useSounds } from '@/lib/hooks/useSounds'
import { SuperUserOneTwoOne } from '@/types/super.types'
import { deleteOneTwoOne } from '@/lib/actions/super/deleteOneTwoOne'
import { SuperDashStatusBadge } from '@/app/(authenticated)/(active)/super/_components/SuperDashStatusBadge'
import { InlineActionBtn } from '@/app/(authenticated)/(active)/super/_components/InlineActionButton'

// ─── Sub-components ──────────────────────────────────────────────────────────
const COLS = 'grid grid-cols-[2fr_1.5fr_1fr_1fr] gap-4 px-4'
const HEADS = ['Members', 'Company · Date', 'Status', 'Created']

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

// ─── Main ────────────────────────────────────────────────────────────────────
export function OneTwoOneClient({ oneTwoOnes }: { oneTwoOnes: SuperUserOneTwoOne[] }) {
  const router = useRouter()
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const { play } = useSounds({ enabled: true, volume: 0.4 })

  async function handleDelete(id: string) {
    setLoadingId(id)
    const res = await deleteOneTwoOne(id)
    if (res.success) {
      play('se7')
      router.refresh()
      setLoadingId(null)
      setConfirmId(null)
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
            1-2-1 Meetings
          </h1>
        </div>
        <span className="text-[11px] font-mono text-on-dark">{oneTwoOnes?.length ?? 0}</span>
      </div>

      {/* ── Table ── */}
      <div className="border border-border-light dark:border-border-dark overflow-hidden">
        {oneTwoOnes?.length === 0 ? (
          <p className="px-4 py-8 text-[12.5px] font-nunito text-muted-light dark:text-muted-dark text-center">
            No meetings yet
          </p>
        ) : (
          <>
            <TableHead />
            <div className="divide-y divide-border-light dark:divide-border-dark">
              {oneTwoOnes?.map((m, i) => (
                <motion.div
                  key={m?.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: i * 0.025 }}
                  className="px-4 py-3 hover:bg-surface-light dark:hover:bg-surface-dark transition-colors"
                >
                  <div className={`${COLS} items-center mb-2`}>
                    {/* Members */}
                    <p className="text-[13px] font-sora font-bold text-text-light dark:text-text-dark leading-snug truncate">
                      {m?.requester.name}
                      <span className="font-normal text-muted-light dark:text-muted-dark mx-1.5">→</span>
                      {m?.recipient.name}
                    </p>

                    {/* Company · Date */}
                    <p className="text-[11.5px] font-nunito text-muted-light dark:text-muted-dark truncate">
                      {m?.requester.company} · {fmtDate(m?.scheduledAt)}
                    </p>

                    {/* Status */}
                    <SuperDashStatusBadge status={m?.status} />

                    {/* Created */}
                    <span className="text-[10px] font-mono text-muted-light dark:text-muted-dark">
                      {timeAgo(m?.createdAt)}
                    </span>
                  </div>

                  {/* Notes */}
                  {m?.notes && (
                    <p className="text-[11.5px] font-nunito text-muted-light dark:text-muted-dark mb-2 line-clamp-1 italic">
                      "{m?.notes}"
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    {confirmId === m?.id ? (
                      <>
                        <InlineActionBtn
                          variant="delete"
                          onClick={() => handleDelete(m?.id)}
                          disabled={loadingId === m?.id}
                        >
                          Confirm delete
                        </InlineActionBtn>
                        <InlineActionBtn
                          variant="neutral"
                          onClick={() => setConfirmId(null)}
                          disabled={loadingId === m?.id}
                        >
                          Cancel
                        </InlineActionBtn>
                      </>
                    ) : (
                      <InlineActionBtn
                        variant="delete"
                        onClick={() => setConfirmId(m?.id)}
                        disabled={loadingId === m?.id}
                      >
                        Delete
                      </InlineActionBtn>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
