'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { SuperUserAnchor } from '@/types/super.types'
import { deleteAnchor } from '@/lib/actions/super/superUserActions'
import { SuperDashStatusBadge } from '@/app/(authenticated)/(active)/super/_components/SuperDashStatusBadge'
import { InlineActionBtn } from '@/app/(authenticated)/(active)/super/_components/InlineActionButton'
import { useSounds } from '@/lib/hooks/useSounds'
import { fmtCurrency } from '@/lib/utils/currency.utils'
import { fmtDate, timeAgo } from '@/lib/utils/date.utils'

// ─── Sub-components ──────────────────────────────────────────────────────────
const COLS = 'grid grid-cols-[1fr_2fr_1.5fr_1fr_1fr] gap-4 px-4'
const HEADS = ['Value', 'Members', 'Description · Closed', 'Status', 'Created']

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
export function SuperClosedBusinessClient({ anchors }: { anchors: SuperUserAnchor[] }) {
  const router = useRouter()
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const { play } = useSounds({ enabled: true, volume: 0.4 })

  async function handleDelete(id: string) {
    setLoadingId(id)
    const res = await deleteAnchor(id)
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
            Closed Business
          </h1>
        </div>
        <span className="text-[11px] font-mono text-on-dark">{anchors?.length ?? 0}</span>
      </div>

      {/* ── Table ── */}
      <div className="border border-border-light dark:border-border-dark overflow-hidden">
        {anchors?.length === 0 ? (
          <p className="px-4 py-8 text-[12.5px] font-nunito text-muted-light dark:text-muted-dark text-center">
            No closed business yet
          </p>
        ) : (
          <>
            <TableHead />
            <div className="divide-y divide-border-light dark:divide-border-dark">
              {anchors?.map((a, i) => (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: i * 0.025 }}
                  className="px-4 py-3 hover:bg-surface-light dark:hover:bg-surface-dark transition-colors"
                >
                  <div className={`${COLS} items-center mb-2`}>
                    {/* Value */}
                    <p className="font-sora font-black text-[15px] text-primary-light dark:text-primary-dark tabular-nums">
                      {fmtCurrency(a.businessValue)}
                    </p>

                    {/* Members */}
                    <p className="text-[13px] font-sora font-bold text-text-light dark:text-text-dark leading-snug truncate">
                      {a.giver?.name ?? 'External'}
                      <span className="font-normal text-muted-light dark:text-muted-dark mx-1.5">→</span>
                      {a.receiver?.name ?? 'External'}
                    </p>

                    {/* Description · Closed */}
                    <p className="text-[11.5px] font-nunito text-muted-light dark:text-muted-dark truncate">
                      {a.description} · {fmtDate(a.closedDate)}
                    </p>

                    {/* Status */}
                    <SuperDashStatusBadge status={a.status} />

                    {/* Created */}
                    <span className="text-[10px] font-mono text-muted-light dark:text-muted-dark">
                      {timeAgo(a.createdAt)}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    {confirmId === a.id ? (
                      <>
                        <InlineActionBtn
                          variant="delete"
                          onClick={() => handleDelete(a.id)}
                          disabled={loadingId === a.id}
                        >
                          Confirm delete
                        </InlineActionBtn>
                        <InlineActionBtn
                          variant="neutral"
                          onClick={() => setConfirmId(null)}
                          disabled={loadingId === a.id}
                        >
                          No
                        </InlineActionBtn>
                      </>
                    ) : (
                      <InlineActionBtn
                        variant="delete"
                        onClick={() => setConfirmId(a.id)}
                        disabled={loadingId === a.id}
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
