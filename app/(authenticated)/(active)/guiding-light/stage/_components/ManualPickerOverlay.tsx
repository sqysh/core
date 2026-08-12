import { getInitials } from '@/lib/utils/shared.utils'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { Member } from '../../_types/guiding-light.types'

interface Props {
  title: string
  show: boolean
  submitting: boolean
  members: Member[]
  onClose: () => void
  onSelect: (memberId: string) => void
}

export default function ManualPickerOverlay({ title, show, submitting, members, onClose, onSelect }: Props) {
  return (
    <AnimatePresence>
      {show && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 backdrop-blur-sm"
            style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: 'spring', stiffness: 280, damping: 24 }}
            className="fixed bottom-6 right-6 z-50 flex items-center justify-center pointer-events-none"
          >
            <div className="pointer-events-auto w-80 border border-border-dark bg-bg-dark overflow-hidden">
              <div className="px-4 py-3 border-b border-border-dark flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="block w-4 h-px bg-primary-dark shrink-0" />
                  <p className="font-mono text-[9.5px] tracking-[0.2em] uppercase text-primary-dark">{title}</p>
                </div>
                <button onClick={onClose} className="text-muted-dark hover:text-text-dark transition-colors">
                  <X size={14} />
                </button>
              </div>
              <div className="divide-y divide-border-dark max-h-96 overflow-y-auto">
                {members.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => onSelect(m.id)}
                    disabled={submitting}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-dark transition-colors disabled:opacity-40 text-left"
                  >
                    <div className="w-8 h-8 rounded-full overflow-hidden border border-border-dark bg-primary-dark/10 flex items-center justify-center shrink-0">
                      {m.profileImage ? (
                        <img src={m.profileImage} alt={m.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="font-sora font-black text-[10px] text-primary-dark">
                          {getInitials(m.name)}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-sora font-bold text-[13px] text-text-dark truncate">{m.name}</p>
                      <p className="font-mono text-[10px] text-muted-dark truncate">{m.company}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
