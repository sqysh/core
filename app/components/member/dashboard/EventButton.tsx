'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createEvent } from '@/app/lib/actions/event/createEvent'
import { EventOrg } from '@prisma/client'
import { useSounds } from '@/app/lib/hooks/useSounds'
import { EVENT_ORGS } from '@/app/lib/constants/member/event.constants'
import { inputCls } from '@/app/lib/constants/member/dashboard.constants'

export function EventButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [org, setOrg] = useState<
    'LYNN_CHAMBER' | 'NORTH_SHORE_LATINO' | 'BOYS_AND_GIRLS_CLUB' | 'TOUCHSTONE' | 'JONAH_GROUP' | 'OTHER'
  >('LYNN_CHAMBER')
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [link, setLink] = useState('')
  const [loading, setLoading] = useState(false)
  const { play } = useSounds({ enabled: true, volume: 0.4 })

  function handleClose() {
    setOpen(false)
    setOrg('LYNN_CHAMBER')
    setName('')
    setDesc('')
    setLink('')
  }

  async function handleSubmit() {
    if (!org || !name.trim()) return
    setLoading(true)
    const res = await createEvent({ org, name, description: desc, externalLink: link })
    setLoading(false)
    if (res.success) {
      play('se3')
      handleClose()
      router.refresh()
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-4 px-4 py-4 border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark dark:hover:bg-surface-dark transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark group cursor-pointer group"
      >
        <div className="w-10 h-10 shrink-0 border border-border-light dark:border-border-dark flex items-center justify-center">
          <Calendar
            size={16}
            className="text-muted-light dark:text-muted-dark group-hover:animate-rotate-clock"
            aria-hidden="true"
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-sora font-black text-[14px] text-text-light dark:text-text-dark leading-tight mb-0.5">
            Share an Upcoming Event
          </p>
          <p className="text-[12px] font-nunito text-muted-light dark:text-muted-dark">
            Let the group know about an event from your organization.
          </p>
        </div>
        <span className="text-f10 font-mono tracking-widest uppercase text-primary-light dark:text-primary-dark shrink-0">
          Post →
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={handleClose}
              className="fixed inset-0 z-40 backdrop-blur-sm"
              style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}
            />
            <motion.div
              initial={{ y: 28, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 28, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="fixed inset-x-0 bottom-0 z-50 flex justify-center"
            >
              <div
                className="w-full max-w-170 bg-bg-light dark:bg-surface-dark border-t-[3px] border-t-primary-light dark:border-t-primary-dark px-5 pt-6"
                style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <p className="text-f10 font-mono tracking-widest uppercase text-primary-light dark:text-primary-dark mb-1">
                      External Event
                    </p>
                    <h2 className="font-sora font-black text-[20px] text-text-light dark:text-text-dark tracking-tight leading-none">
                      Create an Event
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

                <div className="flex flex-col gap-4 mb-5">
                  {/* Org */}
                  <div>
                    <p className="text-f10 font-mono tracking-[0.15em] uppercase text-muted-light dark:text-muted-dark mb-1.5">
                      Organization
                    </p>
                    <select value={org} onChange={(e) => setOrg(e.target.value as EventOrg)} className={inputCls}>
                      <option value="">Select organization</option>
                      {EVENT_ORGS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Name */}
                  <div>
                    <p className="text-f10 font-mono tracking-[0.15em] uppercase text-muted-light dark:text-muted-dark mb-1.5">
                      Event Name
                    </p>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Monthly mixer"
                      className={inputCls}
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <p className="text-f10 font-mono tracking-[0.15em] uppercase text-muted-light dark:text-muted-dark mb-1.5">
                      Description <span className="normal-case tracking-normal opacity-50">(optional)</span>
                    </p>
                    <textarea
                      value={desc}
                      onChange={(e) => setDesc(e.target.value)}
                      placeholder="Brief description of the event"
                      rows={3}
                      className={`${inputCls} h-auto py-3 resize-none`}
                    />
                  </div>

                  {/* External Link */}
                  <div>
                    <p className="text-f10 font-mono tracking-[0.15em] uppercase text-muted-light dark:text-muted-dark mb-1.5">
                      Event Link <span className="normal-case tracking-normal opacity-50">(optional)</span>
                    </p>
                    <input
                      type="url"
                      value={link}
                      onChange={(e) => setLink(e.target.value)}
                      placeholder="https://..."
                      className={inputCls}
                    />
                  </div>
                </div>

                <div className="flex gap-2.5">
                  <button
                    onClick={handleClose}
                    className="h-12 px-5 border border-slate-300 dark:border-border-dark text-muted-light dark:text-muted-dark font-nunito text-sm hover:bg-surface-light dark:hover:bg-surface-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={!org || !name.trim() || loading}
                    className="flex-1 h-12 bg-primary-light dark:bg-button-dark text-white font-sora font-bold text-sm tracking-wide flex items-center justify-center gap-2 hover:opacity-90 active:opacity-80 transition-opacity disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark focus-visible:ring-offset-2"
                  >
                    {loading ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                          aria-hidden="true"
                        />
                        Creating...
                      </>
                    ) : (
                      'Create Event'
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
