import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useEffect, useRef } from 'react'

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

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

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
          className="fixed inset-0 z-100 flex sm:items-end sm:justify-center"
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
            className="flex flex-col w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-170 bg-bg-light dark:bg-surface-dark border-t-[3px]"
            style={{ borderTopColor: accentColor }}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 px-5 pt-6 pb-5 shrink-0">
              <div className="min-w-0">
                <p className="text-f10 font-mono tracking-[0.12em] uppercase mb-1.5" style={{ color: tagColor }}>
                  {tag}
                </p>
                <h2 className="font-sora font-black text-[24px] text-text-light dark:text-text-dark tracking-tight leading-none">
                  {title}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="shrink-0 -mr-2 -mt-1 w-11 h-11 flex items-center justify-center text-muted-light dark:text-muted-dark hover:text-text-light dark:hover:text-text-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark"
                aria-label="Close"
              >
                <X size={22} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-4">
              <div className="flex flex-col gap-4">{children}</div>

              {error && (
                <p className="mt-3 text-[15px] font-nunito text-red-600 dark:text-red-400" role="alert">
                  {error}
                </p>
              )}
            </div>

            {/* Footer */}
            <div
              className="shrink-0 flex gap-2.5 px-5 pt-4 border-t border-border-light dark:border-border-dark"
              style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
            >
              <button
                onClick={onClose}
                disabled={pending}
                className="h-12 px-5 border border-slate-300 dark:border-border-dark text-text-light dark:text-text-dark font-nunito text-[15px] hover:bg-surface-light dark:hover:bg-surface-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={onSubmit}
                disabled={pending}
                className="flex-1 h-12 bg-primary-light dark:bg-button-dark text-white font-sora font-bold text-[15px] tracking-wide hover:opacity-90 active:opacity-80 transition-opacity disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark focus-visible:ring-offset-2"
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
