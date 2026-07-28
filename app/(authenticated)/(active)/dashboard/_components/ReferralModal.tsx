import { createReferral } from '@/lib/actions/referral/createReferral'
import { useSounds } from '@/lib/hooks/useSounds'
import { useSession } from 'next-auth/react'
import { useState } from 'react'
import { Modal } from '../../../../../components/_shared/Modal'
import { MemberOptions } from './MemberOptions'
import { formatPhone } from '@/lib/utils/phone.utils'
import { inputCls } from '@/lib/constants/member/dashboard.constants'
import { FormField } from '../../../../../components/_shared/FormField'
import { FormSelectField } from '@/components/_shared/FormSelectField'

export function ReferralModal({ open, members, onClose, onSuccess }) {
  const session = useSession()
  const [to, setTo] = useState('')
  const [client, setClient] = useState('')
  const [phone, setPhone] = useState('')
  const [service, setService] = useState('')
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { play } = useSounds({ enabled: true, volume: 0.4 })

  async function handleSubmit() {
    if (!to) return setError('Please select a member.')
    if (!client) return setError('Please enter the contact name.')
    if (!phone) return setError('Please enter the contact phone number.')
    if (!service) return setError('Please describe the service needed.')
    setIsPending(true)
    const res = await createReferral({
      receiverId: to,
      clientName: client,
      clientPhone: phone,
      serviceNeeded: service,
      giverId: session.data.user.id
    })
    setIsPending(false)
    if (!res.success) return setError(res.error ?? 'Something went wrong.')
    play('se2')
    setTo('')
    setClient('')
    setPhone('')
    setService('')
    onSuccess()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      accentColor="#22d3ee"
      tag="02 · Referral"
      tagColor="#0891b2"
      title="Give a Referral"
      submitLabel="Send Referral"
      onSubmit={handleSubmit}
      pending={isPending}
      error={error}
    >
      <FormField label="Referring to" id="ref-to">
        <FormSelectField id="ref-to" value={to} onChange={setTo}>
          <MemberOptions members={members} />
        </FormSelectField>
      </FormField>
      <FormField label="Contact name" id="ref-client">
        <input
          id="ref-client"
          type="text"
          value={client}
          onChange={(e) => setClient(e.target.value)}
          placeholder="Who are you referring?"
          className={inputCls}
        />
      </FormField>
      <FormField label="Contact phone" id="ref-phone">
        <input
          id="ref-phone"
          type="tel"
          value={formatPhone(phone)}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
          placeholder="(555) 000-0000"
          className={inputCls}
        />
      </FormField>
      <FormField label="Service needed" id="ref-service">
        <input
          id="ref-service"
          type="text"
          value={service}
          onChange={(e) => setService(e.target.value)}
          placeholder="What do they need?"
          className={inputCls}
        />
      </FormField>
    </Modal>
  )
}
