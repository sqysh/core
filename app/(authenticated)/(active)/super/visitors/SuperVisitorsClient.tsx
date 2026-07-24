'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { deleteVisitor } from '@/app/lib/actions/super/deleteVisitor'
import { InlineActionBtn } from '@/app/components/super-dash/InlineActionButton'
import { useSounds } from '@/app/lib/hooks/useSounds'
import { fmtDate, timeAgo } from '@/app/lib/utils/date.utils'
import { Visitor } from '@/types/visitor.types'

// ─── Sub-components ──────────────────────────────────────────────────────────
const COLS = 'grid grid-cols-[2fr_1.5fr_1fr_1fr] gap-4 px-4'
const HEADS = ['Visitor', 'Email', 'Visit Date', 'Invited By']

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
export function SuperVisitorsClient({ visitors }: { visitors: Visitor[] }) {
  const router = useRouter()
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const { play } = useSounds({ enabled: true, volume: 0.4 })

  async function handleDelete(id: string) {
    setLoadingId(id)
    const res = await deleteVisitor({ id })
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
            Visitors
          </h1>
        </div>
        <span className="text-[11px] font-mono text-on-dark">{visitors?.length ?? 0}</span>
      </div>

      {/* ── Table ── */}
      <div className="border border-border-light dark:border-border-dark overflow-hidden">
        {visitors?.length === 0 ? (
          <p className="px-4 py-8 text-[12.5px] font-nunito text-muted-light dark:text-muted-dark text-center">
            No visitors logged yet
          </p>
        ) : (
          <>
            <TableHead />
            <div className="divide-y divide-border-light dark:divide-border-dark">
              {visitors?.map((v, i) => (
                <motion.div
                  key={v.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: i * 0.025 }}
                  className="px-4 py-3 hover:bg-surface-light dark:hover:bg-surface-dark transition-colors"
                >
                  <div className={`${COLS} items-center mb-2`}>
                    {/* Visitor name + company/industry */}
                    <div className="min-w-0">
                      <p className="text-[13px] font-sora font-bold text-text-light dark:text-text-dark truncate">
                        {v.firstName} {v.lastName}
                      </p>
                      {(v.company || v.industry) && (
                        <p className="text-[11px] font-nunito text-muted-light dark:text-muted-dark truncate mt-0.5">
                          {[v.company, v.industry].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>

                    {/* Email */}
                    <p className="text-[12px] font-mono text-muted-light dark:text-muted-dark truncate">{v.email}</p>

                    {/* Visit date */}
                    <span className="text-[11px] font-mono tracking-widest text-primary-light dark:text-primary-dark">
                      {fmtDate(v.visitDate)}
                    </span>

                    {/* Invited by */}
                    <span className="text-[11px] font-mono text-muted-light dark:text-muted-dark truncate">
                      {v.invitedBy ? v.invitedBy.name : <span className="text-on-dark">—</span>}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    {confirmId === v.id ? (
                      <>
                        <InlineActionBtn
                          variant="delete"
                          onClick={() => handleDelete(v.id)}
                          disabled={loadingId === v.id}
                        >
                          Confirm delete
                        </InlineActionBtn>
                        <InlineActionBtn
                          variant="neutral"
                          onClick={() => setConfirmId(null)}
                          disabled={loadingId === v.id}
                        >
                          Cancel
                        </InlineActionBtn>
                      </>
                    ) : (
                      <InlineActionBtn
                        variant="delete"
                        onClick={() => setConfirmId(v.id)}
                        disabled={loadingId === v.id}
                      >
                        Delete
                      </InlineActionBtn>
                    )}
                    <span className="ml-auto text-[10px] font-mono text-muted-light dark:text-muted-dark">
                      {timeAgo(v.createdAt)}
                    </span>
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
