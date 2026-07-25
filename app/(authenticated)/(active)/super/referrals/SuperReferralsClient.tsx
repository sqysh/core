'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { SuperUserReferral } from '@/types/super.types'
import { deleteReferral } from '@/app/lib/actions/super/deleteReferral'
import { SuperDashStatusBadge } from '@/app/components/super/SuperDashStatusBadge'
import { InlineActionBtn } from '@/app/components/super/InlineActionButton'
import { useSounds } from '@/app/lib/hooks/useSounds'
import { timeAgo } from '@/app/lib/utils/date.utils'

// ─── Sub-components ──────────────────────────────────────────────────────────
const COLS = 'grid grid-cols-[2fr_1.5fr_1fr_1fr] gap-4 px-4'
const HEADS = ['Members', 'Client · Service', 'Status', 'Created']

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
export function SuperReferralsClient({ referrals }: { referrals: SuperUserReferral[] }) {
  const router = useRouter()
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const { play } = useSounds({ enabled: true, volume: 0.4 })

  async function handleDelete(id: string) {
    setLoadingId(id)
    const res = await deleteReferral(id)
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
            Referrals
          </h1>
        </div>
        <span className="text-[11px] font-mono text-on-dark">{referrals?.length ?? 0}</span>
      </div>

      {/* ── Table ── */}
      <div className="border border-border-light dark:border-border-dark overflow-hidden">
        {referrals?.length === 0 ? (
          <p className="px-4 py-8 text-[12.5px] font-nunito text-muted-light dark:text-muted-dark text-center">
            No referrals yet
          </p>
        ) : (
          <>
            <TableHead />
            <div className="divide-y divide-border-light dark:divide-border-dark">
              {referrals?.map((r, i) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: i * 0.025 }}
                  className="px-4 py-3 hover:bg-surface-light dark:hover:bg-surface-dark transition-colors"
                >
                  <div className={`${COLS} items-center mb-2`}>
                    {/* Members */}
                    <p className="text-[13px] font-sora font-bold text-text-light dark:text-text-dark leading-snug truncate">
                      {r.giver.name}
                      <span className="font-normal text-muted-light dark:text-muted-dark mx-1.5">→</span>
                      {r.receiver.name}
                    </p>

                    {/* Client · Service */}
                    <p className="text-[11.5px] font-nunito text-muted-light dark:text-muted-dark truncate">
                      {r.clientName} · {r.serviceNeeded}
                    </p>

                    {/* Status */}
                    <SuperDashStatusBadge status={r.status} />

                    {/* Created */}
                    <span className="text-[10px] font-mono text-muted-light dark:text-muted-dark">
                      {timeAgo(r.createdAt)}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    {confirmId === r.id ? (
                      <>
                        <InlineActionBtn
                          variant="delete"
                          onClick={() => handleDelete(r.id)}
                          disabled={loadingId === r.id}
                        >
                          Confirm delete
                        </InlineActionBtn>
                        <InlineActionBtn
                          variant="neutral"
                          onClick={() => setConfirmId(null)}
                          disabled={loadingId === r.id}
                        >
                          Cancel
                        </InlineActionBtn>
                      </>
                    ) : (
                      <InlineActionBtn
                        variant="delete"
                        onClick={() => setConfirmId(r.id)}
                        disabled={loadingId === r.id}
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
