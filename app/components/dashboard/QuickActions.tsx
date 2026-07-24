'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { create121 } from '@/app/lib/actions/1-2-1/create121'
import { createReferral } from '@/app/lib/actions/referral/createReferral'
import { formatPhone } from '@/app/lib/utils/phone.utils'
import { formatAmountInput } from '@/app/lib/utils/currency.utils'
import { Modal } from '../common/Modal'
import { Field, inputCls } from '../common/Field'
import { SelectField } from '../common/SelectField'
import { useSounds } from '@/app/lib/hooks/useSounds'
import { ACTIONS } from '@/app/lib/constants/dashboard.constants'
import { Member, ModalKey, QuickActionsProps } from '@/types/dashboard.types'
import { createAnchor } from '@/app/lib/actions/tyfcb/createAnchor'

function MemberOptions({ members, showOutOfChapterMember }: { members: Member[]; showOutOfChapterMember?: boolean }) {
  return (
    <>
      <option value="" disabled>
        Select a member…
      </option>
      {showOutOfChapterMember && <option value="external">Out of chaper member</option>}
      {members.map((m) => (
        <option key={m.id} value={m.id}>
          {m.name}
          {m.industry ? ` · ${m.industry}` : ''}
        </option>
      ))}
    </>
  )
}

function QuickActionButton({ action, onClick }: { action: (typeof ACTIONS)[number]; onClick: () => void }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-32px' })
  const { icon: Icon, colors, tagShort, label, desc } = action

  return (
    <motion.button
      ref={ref}
      initial={{ opacity: 0 }}
      animate={inView ? { opacity: 1 } : {}}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      onClick={onClick}
      style={{ WebkitTapHighlightColor: 'transparent' }}
      className={`w-full text-left flex items-center gap-4 px-5 py-5 ${colors.bg} ${colors.border} border ${colors.hover} active:scale-[0.985] transition-[transform,background-color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark focus-visible:ring-offset-2`}
      aria-label={`Open ${label} form`}
    >
      <Icon size={22} className={`${colors.tag} shrink-0`} strokeWidth={1.75} aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <p className={`text-f10 font-mono tracking-[0.2em] uppercase mb-1 ${colors.tag}`}>{tagShort}</p>
        <p className={`font-sora font-bold text-[17px] leading-tight tracking-tight mb-0.5 ${colors.title}`}>{label}</p>
        <p className={`text-[12.5px] font-nunito ${colors.desc}`}>{desc}</p>
      </div>
    </motion.button>
  )
}

export default function QuickActions({ members, variant }: QuickActionsProps) {
  const session = useSession()
  const [activeModal, setActiveModal] = useState<ModalKey>(null)
  const [isPending, setIsPending] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [f2fMember, setF2fMember] = useState('')
  const [f2fDate, setF2fDate] = useState(new Date().toISOString().split('T')[0])
  const [f2fNotes, setF2fNotes] = useState('')

  const [refTo, setRefTo] = useState('')
  const [refClient, setRefClient] = useState('')
  const [refPhone, setRefPhone] = useState('')
  const [refService, setRefService] = useState('')

  const [closedFrom, setClosedFrom] = useState('')
  const [closedAmount, setClosedAmount] = useState('')
  const [closedDesc, setClosedDesc] = useState('')
  const [closedDate, setClosedDate] = useState(new Date().toISOString().split('T')[0])

  const searchParams = useSearchParams()

  useEffect(() => {
    const action = searchParams.get('action')
    if (action === 'f2f' || action === 'referral' || action === 'closed') {
      setActiveModal(action)
    }
  }, [searchParams])

  const router = useRouter()

  const { play } = useSounds({ enabled: true, volume: 0.4 })

  function openModal(key: ModalKey) {
    play('se9')
    setFormError(null)
    setActiveModal(key)
  }

  function closeModal() {
    if (isPending) return
    play('se10')
    setActiveModal(null)
    setFormError(null)
  }

  async function handleSubmit() {
    setFormError(null)

    if (activeModal === 'f2f') {
      if (!f2fMember) return setFormError('Please select a member.')
      setIsPending(true)
      const res = await create121({
        recipientId: f2fMember,
        scheduledAt: new Date(f2fDate),
        notes: f2fNotes
      })
      setIsPending(false)
      if (!res.success) return setFormError(res.error ?? 'Something went wrong.')
      play('se2')
      router.refresh()
      setF2fMember('')
      setF2fNotes('')
      setF2fDate(new Date().toISOString().split('T')[0])
      closeModal()
    }

    if (activeModal === 'referral') {
      if (!refTo) return setFormError('Please select a member.')
      if (!refClient) return setFormError('Please enter the contact name.')
      if (!refPhone) return setFormError('Please enter the contact phone number.')
      if (!refService) return setFormError('Please describe the service needed.')
      setIsPending(true)
      const res = await createReferral({
        receiverId: refTo,
        clientName: refClient,
        clientPhone: refPhone,
        serviceNeeded: refService,
        giverId: session.data.user.id
      })
      setIsPending(false)
      if (!res.success) return setFormError(res.error ?? 'Something went wrong.')
      play('se2')
      router.refresh()
      setRefTo('')
      setRefClient('')
      setRefPhone('')
      setRefService('')
      closeModal()
    }

    if (activeModal === 'closed') {
      if (!closedFrom) return setFormError('Please select a member.')
      if (!closedAmount) return setFormError('Please enter the amount.')
      if (!closedDesc) return setFormError('Please add a brief description.')

      setIsPending(true)
      const res = await createAnchor({
        businessValue: Number(closedAmount),
        description: closedDesc,
        closedDate: new Date(closedDate),
        giverId: closedFrom
      })
      setIsPending(false)
      if (!res.success) return setFormError(res.error ?? 'Something went wrong.')
      play('se2')
      router.refresh()
      setClosedFrom('')
      setClosedAmount('')
      setClosedDesc('')
      setClosedDate(new Date().toISOString().split('T')[0])
      closeModal()
    }
  }

  const activeAction = ACTIONS.find((a) => a.key === activeModal)

  return (
    <>
      {/* ── Buttons ── */}
      <div className={variant === 'card' ? 'flex flex-col gap-3' : 'grid grid-cols-1 xs:grid-cols-3 gap-3 mb-6'}>
        {ACTIONS.map((a) => (
          <QuickActionButton key={a.key} action={a} onClick={() => openModal(a.key)} />
        ))}
      </div>

      {/* ── Modals ── */}
      {activeAction && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={closeModal}
            className="fixed inset-0 z-40 backdrop-blur-sm"
            style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}
          />
          <Modal
            open={activeModal === 'f2f'}
            onClose={closeModal}
            accentColor="#38bdf8"
            tag="01 · Meeting"
            tagColor="#0284c7"
            title="Face-2-Face"
            submitLabel="Log Meeting"
            onSubmit={handleSubmit}
            pending={isPending}
            error={formError}
          >
            <Field label="Member" htmlFor="f2f-member">
              <SelectField id="f2f-member" value={f2fMember} onChange={setF2fMember}>
                <MemberOptions members={members} />
              </SelectField>
            </Field>
            <Field label="Date" htmlFor="f2f-date">
              <input
                id="f2f-date"
                type="date"
                value={f2fDate}
                onChange={(e) => setF2fDate(e.target.value)}
                className={inputCls}
                required
              />
            </Field>
            <Field label="Notes" htmlFor="f2f-notes" optional>
              <input
                id="f2f-notes"
                type="text"
                value={f2fNotes}
                onChange={(e) => setF2fNotes(e.target.value)}
                placeholder="What did you discuss?"
                className={inputCls}
              />
            </Field>
          </Modal>

          <Modal
            open={activeModal === 'referral'}
            onClose={closeModal}
            accentColor="#22d3ee"
            tag="02 · Referral"
            tagColor="#0891b2"
            title="Give a Referral"
            submitLabel="Send Referral"
            onSubmit={handleSubmit}
            pending={isPending}
            error={formError}
          >
            <Field label="Referring to" htmlFor="ref-to">
              <SelectField id="ref-to" value={refTo} onChange={setRefTo}>
                <MemberOptions members={members} />
              </SelectField>
            </Field>
            <Field label="Contact name" htmlFor="ref-client">
              <input
                id="ref-client"
                type="text"
                value={refClient}
                onChange={(e) => setRefClient(e.target.value)}
                placeholder="Who are you referring?"
                className={inputCls}
                required
              />
            </Field>
            <Field label="Contact phone" htmlFor="ref-phone">
              <input
                id="ref-phone"
                type="tel"
                value={formatPhone(refPhone)}
                onChange={(e) => setRefPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="(555) 000-0000"
                className={inputCls}
              />
            </Field>
            <Field label="Service needed" htmlFor="ref-service">
              <input
                id="ref-service"
                type="text"
                value={refService}
                onChange={(e) => setRefService(e.target.value)}
                placeholder="What do they need?"
                className={inputCls}
                required
              />
            </Field>
          </Modal>

          <Modal
            open={activeModal === 'closed'}
            onClose={closeModal}
            accentColor="#34d399"
            tag="Thank You for"
            tagColor="#059669"
            title="Closed Business"
            submitLabel="Submit"
            onSubmit={handleSubmit}
            pending={isPending}
            error={formError}
          >
            <Field label="Thank you to" htmlFor="closed-from">
              <SelectField id="closed-from" value={closedFrom} onChange={setClosedFrom}>
                <MemberOptions members={members} showOutOfChapterMember />
              </SelectField>
            </Field>
            <Field label="Amount closed" htmlFor="closed-amount">
              <input
                id="closed-amount"
                type="text"
                value={formatAmountInput(closedAmount)}
                onChange={(e) => setClosedAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                placeholder="0.00"
                inputMode="decimal"
                className={inputCls}
                required
              />
            </Field>
            <Field label="Description" htmlFor="closed-desc">
              <input
                id="closed-desc"
                type="text"
                value={closedDesc}
                onChange={(e) => setClosedDesc(e.target.value)}
                placeholder="Brief description of the business"
                className={inputCls}
                required
              />
            </Field>
            <Field label="Date closed" htmlFor="closed-date">
              <input
                id="closed-date"
                type="date"
                value={closedDate}
                onChange={(e) => setClosedDate(e.target.value)}
                className={inputCls}
                required
              />
            </Field>
          </Modal>
        </>
      )}
    </>
  )
}
