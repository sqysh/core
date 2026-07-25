import { create121 } from '@/app/lib/actions/1-2-1/create121'
import { useSounds } from '@/app/lib/hooks/useSounds'
import { Member } from '@/types/dashboard.types'
import { useState } from 'react'
import { inputCls } from '@/app/lib/constants/member/dashboard.constants'
import { Modal } from '../Modal'
import { FormField } from '@/app/components/_shared/FormField'
import { MemberOptions } from '../MemberOptions'
import { FormSelectField } from '@/app/components/_shared/FormSelectField'

export function F2FModal({
  open,
  members,
  onClose,
  onSuccess
}: {
  open: boolean
  members: Member[]
  onClose: () => void
  onSuccess: () => void
}) {
  const [member, setMember] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { play } = useSounds({ enabled: true, volume: 0.4 })

  async function handleSubmit() {
    if (!member) return setError('Please select a member.')
    setIsPending(true)
    const res = await create121({ recipientId: member, scheduledAt: new Date(date), notes })
    setIsPending(false)
    if (!res.success) return setError(res.error ?? 'Something went wrong.')
    play('se2')
    setMember('')
    setNotes('')
    setDate(new Date().toISOString().split('T')[0])
    onSuccess()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      accentColor="#38bdf8"
      tag="01 · Meeting"
      tagColor="#0284c7"
      title="1-2-1 Meeting"
      submitLabel="Log Meeting"
      onSubmit={handleSubmit}
      pending={isPending}
      error={error}
    >
      <FormField label="Member" id="f2f-member">
        <FormSelectField id="f2f-member" value={member} onChange={setMember}>
          <MemberOptions members={members} />
        </FormSelectField>
      </FormField>
      <FormField label="Date" id="f2f-date">
        <input id="f2f-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
      </FormField>
      <FormField label="Notes" id="f2f-notes" optional>
        <input
          id="f2f-notes"
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="What did you discuss?"
          className={inputCls}
        />
      </FormField>
    </Modal>
  )
}
