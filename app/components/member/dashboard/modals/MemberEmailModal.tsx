import { sendMemberEmail } from '@/app/lib/actions/user/sendMemberEmail'
import { AnimatePresence, motion } from 'framer-motion'
import { Mail, X } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useState } from 'react'

export function MemberEmailModal({ emailTarget, sent, emailBody, setEmailBody, setSent, setEmailTarget }) {
  const session = useSession()
  const [sending, setSending] = useState(false)

  function handleClose() {
    setEmailTarget(null)
    setEmailBody('')
    setSent(false)
  }

  async function handleSendEmail() {
    if (!emailBody.trim() || !emailTarget) return
    setSending(true)
    const res = await sendMemberEmail({
      to: emailTarget.email,
      from: session.data?.user?.name ?? 'A member',
      message: emailBody
    })
    setSending(false)
    if (res.success) {
      setSent(true)
      setEmailBody('')
      setTimeout(handleClose, 2000)
    }
  }

  return (
    <AnimatePresence>
      {emailTarget && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={handleClose}
            className="fixed inset-0 z-50 backdrop-blur-sm"
            style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}
          />
          <motion.div
            initial={{ y: 28, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 28, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="fixed inset-x-0 bottom-0 z-60 flex justify-center"
          >
            <div
              className="w-full max-w-170 bg-bg-light dark:bg-surface-dark border-t-[3px] border-t-primary-light dark:border-t-primary-dark px-5 pt-6"
              style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
            >
              <div className="flex items-start justify-between mb-5">
                <div>
                  <p className="text-f10 font-mono tracking-widest uppercase text-primary-light dark:text-primary-dark mb-1">
                    Email
                  </p>
                  <h2 className="font-sora font-black text-[20px] text-text-light dark:text-text-dark tracking-tight leading-none">
                    {emailTarget.name}
                  </h2>
                </div>
                <button
                  onClick={handleClose}
                  aria-label="Close"
                  className="mt-0.5 p-1 text-muted-light dark:text-muted-dark hover:text-text-light dark:hover:text-text-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark rounded-sm"
                >
                  <X size={18} />
                </button>
              </div>

              {sent ? (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border-l-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-400/5 px-4 py-3 mb-5"
                >
                  <p className="text-[13px] font-nunito text-text-light dark:text-text-dark">
                    Your message was sent to {emailTarget.name}.
                  </p>
                </motion.div>
              ) : (
                <>
                  <textarea
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    placeholder={`What would you like to say to ${emailTarget.name.split(' ')[0]}?`}
                    rows={4}
                    className="w-full bg-white dark:bg-bg-dark border border-slate-300 dark:border-border-dark px-3.5 py-3 font-nunito text-[14px] text-text-light dark:text-text-dark placeholder:text-slate-400 dark:placeholder:text-muted-dark/50 focus:outline-none focus:border-primary-light dark:focus:border-primary-dark transition-colors rounded-none resize-none mb-4"
                  />
                  <div className="flex gap-2.5">
                    <button
                      onClick={handleClose}
                      className="h-12 px-5 border border-slate-300 dark:border-border-dark text-muted-light dark:text-muted-dark font-nunito text-sm hover:bg-surface-light dark:hover:bg-surface-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSendEmail}
                      disabled={!emailBody.trim() || sending}
                      className="flex-1 h-12 bg-primary-light dark:bg-button-dark text-white font-sora font-bold text-sm tracking-wide flex items-center justify-center gap-2 hover:opacity-90 active:opacity-80 transition-opacity disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark focus-visible:ring-offset-2"
                    >
                      {sending ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                            aria-hidden="true"
                          />
                          Sending…
                        </>
                      ) : (
                        <>
                          <Mail size={14} aria-hidden="true" />
                          Send
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
