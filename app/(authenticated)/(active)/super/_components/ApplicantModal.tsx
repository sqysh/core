import { AnimatePresence, motion } from 'framer-motion'
import { SuperDashStatusBadge } from './SuperDashStatusBadge'
import { X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { updateUserStatus } from '@/lib/actions/super/updateUserStatus'
import { deleteUser } from '@/lib/actions/user/deleteUser'
import { fmtDate } from '@/lib/utils/date.utils'

export function ApplicantModal({ selected, setSelected }) {
  const router = useRouter()
  const [loading, setLoading] = useState<'accept' | 'reject' | 'delete' | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function handleAccept() {
    setLoading('accept')
    const res = await updateUserStatus(selected.id, true)
    setLoading(null)
    if (res.success) {
      setSelected(null)
      router.refresh()
    }
  }

  async function handleReject() {
    setLoading('reject')
    const res = await updateUserStatus(selected.id, false)
    setLoading(null)
    if (res.success) {
      setSelected(null)
      router.refresh()
    }
  }

  async function handleDelete() {
    setLoading('delete')
    const res = await deleteUser(selected.id)
    setLoading(null)
    if (res.success) {
      setSelected(null)
      router.refresh()
    }
  }

  return (
    <AnimatePresence>
      {selected && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center px-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelected(null)
          }}
          role="dialog"
          aria-modal="true"
          aria-label={`${selected.name} application`}
        >
          <motion.div
            className="w-full max-w-lg bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark border-t-2 border-t-primary-light dark:border-t-primary-dark"
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 16, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* header */}
            <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-border-light dark:border-border-dark">
              <div>
                <p className="text-f10 font-mono tracking-[0.2em] uppercase text-primary-light dark:text-primary-dark mb-1">
                  Application
                </p>
                <h2 className="font-sora font-black text-[20px] text-text-light dark:text-text-dark tracking-tight leading-none">
                  {selected.name}
                </h2>
              </div>
              <div className="flex items-center gap-3">
                <SuperDashStatusBadge status={selected.membershipStatus} />
                <button
                  onClick={() => setSelected(null)}
                  className="text-muted-light dark:text-muted-dark hover:text-text-light dark:hover:text-text-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark rounded-sm p-0.5"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* body */}
            <div className="px-5 py-4 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                {[
                  { label: 'Company', value: selected.company },
                  { label: 'Industry', value: selected.industry },
                  { label: 'Email', value: selected.email },
                  { label: 'Phone', value: selected.phone ?? '—' },
                  { label: 'License number', value: selected.businessLicenseNumber || '—' },
                  { label: 'Final decision at', value: fmtDate(selected?.finalDecisionAt) || '—' },
                  {
                    label: 'Applied',
                    value: new Date(selected.createdAt).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })
                  },
                  { label: 'Application complete', value: selected.hasCompletedApplication ? 'Yes' : 'No' }
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-f10 font-mono tracking-[0.15em] uppercase text-muted-light dark:text-muted-dark mb-0.5">
                      {label}
                    </p>
                    <p className="text-[13px] font-nunito text-text-light dark:text-text-dark wrap-break-word">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* footer */}
            <div className="px-5 pb-5 pt-2 flex flex-col gap-3">
              {/* accept / reject */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAccept}
                  disabled={!!loading}
                  className="flex-1 h-10 border border-emerald-500 dark:border-emerald-600 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-400/10 font-sora font-bold text-sm transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                  {loading === 'accept' ? 'Accepting…' : 'Accept'}
                </button>
                <button
                  onClick={handleReject}
                  disabled={!!loading}
                  className="flex-1 h-10 border border-border-light dark:border-border-dark text-muted-light dark:text-muted-dark hover:bg-surface-light dark:hover:bg-surface-dark font-sora font-bold text-sm transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark"
                >
                  {loading === 'reject' ? 'Rejecting…' : 'Reject'}
                </button>
                <button
                  onClick={() => setSelected(null)}
                  className="h-10 px-4 text-muted-light dark:text-muted-dark font-nunito text-sm hover:text-text-light dark:hover:text-text-dark transition-colors focus-visible:outline-none"
                >
                  Close
                </button>
              </div>

              {/* danger zone */}
              <div className="border border-red-200 dark:border-red-400/20 bg-red-50 dark:bg-red-400/5 px-4 py-3 flex items-center justify-between gap-3">
                <p className="text-[11.5px] font-nunito text-red-600 dark:text-red-400">
                  Permanently delete this applicant and all their data.
                </p>
                {confirmDelete ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={handleDelete}
                      disabled={loading === 'delete'}
                      className="h-8 px-3 bg-red-500 dark:bg-red-600 text-white text-f10 font-mono tracking-widest uppercase hover:opacity-90 transition-opacity disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                    >
                      {loading === 'delete' ? '…' : 'Confirm'}
                    </button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="h-8 px-3 text-f10 font-mono tracking-widest uppercase text-muted-light dark:text-muted-dark hover:text-text-light dark:hover:text-text-dark transition-colors focus-visible:outline-none"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="shrink-0 h-8 px-3 border border-red-200 dark:border-red-400/30 text-red-500 dark:text-red-400 text-f10 font-mono tracking-widest uppercase hover:bg-red-100 dark:hover:bg-red-400/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
