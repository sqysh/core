import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useRef } from 'react'

export function Modal({
  open,
  onClose,
  accentColor,
  tag,
  tagColor,
  title,
  submitLabel,
  onSubmit,
  pending,
  error,
  children
}: {
  open: boolean
  onClose: () => void
  accentColor: string
  tag: string
  tagColor: string
  title: string
  submitLabel: string
  onSubmit: () => void
  pending: boolean
  error: string | null
  children: React.ReactNode
}) {
  const searchParams = useSearchParams()
  const action = searchParams.get('action')

  const mouseDownTarget = useRef<EventTarget | null>(null)

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          onMouseDown={(e) => {
            mouseDownTarget.current = e.target
          }}
          onMouseUp={(e) => {
            if (mouseDownTarget.current === e.currentTarget) onClose()
          }}
          className="fixed inset-x-0 bottom-0 z-50 flex justify-center"
          initial={{ y: 28, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 28, opacity: 0 }}
          transition={{ duration: 0.22, delay: action ? 0.1 : 0, ease: [0.25, 0.46, 0.45, 0.94] }}
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-170 bg-bg-light dark:bg-surface-dark border-t-[3px] px-5 pt-7"
            style={{ borderTopColor: accentColor, paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}
          >
            <div className="flex items-start justify-between mb-5">
              <div>
                <p className="text-f10 font-mono tracking-[0.22em] uppercase mb-1.5" style={{ color: tagColor }}>
                  {tag}
                </p>
                <h2 className="font-sora font-black text-[22px] text-text-light dark:text-text-dark tracking-tight leading-none">
                  {title}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="mt-0.5 p-1 text-muted-light dark:text-muted-dark hover:text-text-light dark:hover:text-text-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark rounded-sm"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-4">{children}</div>

            {error && (
              <p className="mt-3 text-[12.5px] font-nunito text-red-500 dark:text-red-400" role="alert">
                {error}
              </p>
            )}

            <div className="flex gap-2.5 mt-6">
              <button
                onClick={onClose}
                disabled={pending}
                className="h-12 px-5 border border-slate-300 dark:border-border-dark text-muted-light dark:text-muted-dark font-nunito text-sm hover:bg-surface-light dark:hover:bg-surface-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={onSubmit}
                disabled={pending}
                className="flex-1 h-12 bg-primary-light dark:bg-button-dark text-white font-sora font-bold text-sm tracking-wide hover:opacity-90 active:opacity-80 transition-opacity disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark focus-visible:ring-offset-2"
              >
                {pending ? 'Saving…' : submitLabel}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
