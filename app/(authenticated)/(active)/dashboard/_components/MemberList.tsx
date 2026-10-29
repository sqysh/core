import { User } from '@/types/user.types'
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Mail, MessageSquare, Phone } from 'lucide-react'
import { MemberEmailModal } from './MemberEmailModal'
import { getInitials } from '@/lib/utils/shared.utils'

const VISIBLE = 5

const contactCls =
  'flex-1 h-12 flex items-center justify-center gap-2 border border-primary-light/30 dark:border-primary-dark/30 text-primary-light dark:text-primary-dark hover:bg-primary-light/5 dark:hover:bg-primary-dark/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark'

export function MemberList({ members }: { members: User[] }) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [emailTarget, setEmailTarget] = useState<{ name: string; email: string } | null>(null)
  const [emailBody, setEmailBody] = useState('')
  const [sent, setSent] = useState(false)

  const visible = members.slice(0, VISIBLE)
  const hidden = members.slice(VISIBLE)

  function renderMember(m: User, i: number, animate: boolean) {
    const isOpen = activeId === m.id
    const initials = getInitials(m.name)

    return (
      <motion.li
        key={m.id}
        initial={animate ? { opacity: 0, x: -8 } : false}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: animate ? 0.54 + i * 0.03 : 0, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <button
          onClick={() => setActiveId(isOpen ? null : m.id)}
          className="w-full flex items-center gap-3 px-4 py-4 bg-bg-light dark:bg-bg-dark hover:bg-surface-light dark:hover:bg-surface-dark transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark focus-visible:ring-inset"
          aria-expanded={isOpen}
          aria-label={`${m.name} — tap to see contact options`}
        >
          <div className="w-10 h-10 shrink-0 overflow-hidden bg-primary-light/10 dark:bg-primary-dark/10 border border-primary-light/20 dark:border-primary-dark/20 flex items-center justify-center">
            {m.profileImage ? (
              <img src={m.profileImage} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-[13px] font-mono font-bold text-primary-light dark:text-primary-dark">
                {initials}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[16px] font-sora font-bold text-text-light dark:text-text-dark truncate">{m.name}</p>
            {m.industry && (
              <p className="text-[14px] font-mono text-muted-light dark:text-muted-dark truncate mt-0.5">
                {m.industry}
              </p>
            )}
          </div>
          <ChevronDown
            size={18}
            className={`shrink-0 text-muted-light dark:text-muted-dark transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="overflow-hidden"
            >
              <div className="flex gap-2 px-4 py-3 bg-surface-light dark:bg-surface-dark border-t border-border-light dark:border-border-dark">
                {m.phone ? (
                  <>
                    <a href={`tel:${m.phone}`} className={contactCls}>
                      <Phone size={16} aria-hidden="true" />
                      <span className="text-[14px] font-mono">Call</span>
                    </a>
                    <a href={`sms:${m.phone}`} className={contactCls}>
                      <MessageSquare size={16} aria-hidden="true" />
                      <span className="text-[14px] font-mono">Text</span>
                    </a>
                  </>
                ) : (
                  <p className="flex items-center text-[14px] font-mono text-muted-light dark:text-muted-dark py-1">
                    No phone number on file
                  </p>
                )}
                {m.email && (
                  <button onClick={() => setEmailTarget({ name: m.name, email: m.email })} className={contactCls}>
                    <Mail size={16} aria-hidden="true" />
                    <span className="text-[14px] font-mono">Email</span>
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.li>
    )
  }

  return (
    <>
      {/* ── Email modal ── */}
      <MemberEmailModal
        emailBody={emailBody}
        emailTarget={emailTarget}
        sent={sent}
        setEmailBody={setEmailBody}
        setSent={setSent}
        setEmailTarget={setEmailTarget}
      />

      {/* ── Member list ── */}
      <div className="border border-border-light dark:border-border-dark">
        <ul className="divide-y divide-border-light dark:divide-border-dark">
          {visible.map((m, i) => renderMember(m, i, true))}
        </ul>

        <AnimatePresence initial={false}>
          {expanded && hidden.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <ul className="border-t border-border-light dark:border-border-dark divide-y divide-border-light dark:divide-border-dark">
                {hidden.map((m, i) => renderMember(m, i, false))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>

        {hidden.length > 0 && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="w-full h-12 flex items-center justify-center gap-2 px-4 border-t border-border-light dark:border-border-dark text-[14px] font-mono text-muted-light dark:text-muted-dark hover:text-primary-light dark:hover:text-primary-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark"
          >
            {expanded ? 'Show less' : `Show ${hidden.length} more`}
            <span aria-hidden="true">{expanded ? '−' : '+'}</span>
          </button>
        )}
      </div>
    </>
  )
}
