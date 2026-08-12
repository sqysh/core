import { getInitials } from '@/lib/utils/shared.utils'
import { Check, Trophy } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { Member } from '../../_types/guiding-light.types'

type Props = {
  member: Member
  nominated: boolean
  loading: boolean
  submitting: boolean
  onToggle: () => void
  onConfirm: () => void
}

export default function MemberRow({ member, nominated, loading, submitting, onToggle, onConfirm }: Props) {
  const [confirming, setConfirming] = useState(false)

  return (
    <div
      className={`flex flex-col transition-colors ${
        nominated ? 'bg-amber-50 dark:bg-amber-400/5' : 'bg-bg-light dark:bg-bg-dark'
      }`}
    >
      {/* Main row */}
      <div className="flex items-center gap-3 px-4 py-3.5">
        {/* Avatar */}
        <div className="w-9 h-9 shrink-0 rounded-full overflow-hidden bg-primary-light/10 dark:bg-primary-dark/10 border border-primary-light/20 dark:border-primary-dark/20 flex items-center justify-center">
          {member.profileImage ? (
            <img src={member.profileImage} alt={member.name} className="w-full h-full object-cover" />
          ) : (
            <span className="font-sora font-black text-[11px] text-primary-light dark:text-primary-dark">
              {getInitials(member.name)}
            </span>
          )}
        </div>

        {/* Name */}
        <div className="flex-1 min-w-0">
          <p className="font-sora font-bold text-[14px] text-text-light dark:text-text-dark truncate">{member.name}</p>
          <p className="text-[11px] font-mono text-muted-light dark:text-muted-dark truncate">{member.company}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {nominated && !confirming && (
            <button
              onClick={() => setConfirming(true)}
              disabled={submitting}
              className="h-8 px-3 bg-amber-500 dark:bg-amber-600 text-white font-sora font-bold text-[11px] tracking-wide hover:opacity-90 transition-opacity disabled:opacity-40 inline-flex items-center gap-1.5"
            >
              <Trophy size={12} />
              Select
            </button>
          )}
          <button
            onClick={onToggle}
            disabled={!!loading}
            className={`w-8 h-8 flex items-center justify-center border transition-colors disabled:opacity-40 ${
              nominated
                ? 'border-amber-400 bg-amber-400/10 text-amber-500 dark:text-amber-400'
                : 'border-border-light dark:border-border-dark text-muted-light dark:text-muted-dark hover:border-primary-light dark:hover:border-primary-dark hover:text-primary-light dark:hover:text-primary-dark'
            }`}
            aria-label={nominated ? 'Remove from shortlist' : 'Add to shortlist'}
          >
            {loading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full"
              />
            ) : (
              <Check size={14} className={nominated ? 'opacity-100' : 'opacity-30'} />
            )}
          </button>
        </div>
      </div>

      {/* Inline confirm */}
      <AnimatePresence>
        {confirming && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-t border-amber-200 dark:border-amber-400/20"
          >
            <div className="px-4 py-3 bg-amber-50/80 dark:bg-amber-400/10 flex flex-col gap-2.5">
              <p className="text-[12px] font-nunito text-amber-700 dark:text-amber-300 leading-snug">
                Has everyone finished presenting? This will reveal the winner on the TV.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirming(false)}
                  disabled={submitting}
                  className="flex-1 h-9 border border-amber-300 dark:border-amber-400/30 text-amber-700 dark:text-amber-300 font-sora font-bold text-[11px] hover:bg-amber-100 dark:hover:bg-amber-400/10 transition-colors disabled:opacity-40"
                >
                  Not yet
                </button>
                <button
                  onClick={onConfirm}
                  disabled={submitting}
                  className="flex-1 h-9 bg-amber-500 dark:bg-amber-600 text-white font-sora font-bold text-[11px] hover:opacity-90 transition-opacity disabled:opacity-40 inline-flex items-center justify-center gap-1.5"
                >
                  <Trophy size={12} />
                  {submitting ? 'Revealing…' : 'Yes, reveal'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
