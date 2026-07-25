import { createAnchor } from '@/app/lib/actions/tyfcb/createAnchor'
import { useSounds } from '@/app/lib/hooks/useSounds'
import { useState } from 'react'
import { Modal } from '../Modal'
import { MemberOptions } from '../MemberOptions'
import { inputCls } from '@/app/lib/constants/member/dashboard.constants'
import { formatAmountInput } from '@/app/lib/utils/currency.utils'
import { FormField } from '../../../_shared/FormField'
import { FormSelectField } from '@/app/components/_shared/FormSelectField'

export function ClosedBusinessModal({ open, members, onClose, onSuccess }) {
  const [from, setFrom] = useState('')
  const [amount, setAmount] = useState('')
  const [desc, setDesc] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { play } = useSounds({ enabled: true, volume: 0.4 })

  async function handleSubmit() {
    if (!from) return setError('Please select a member.')
    if (!amount) return setError('Please enter the amount.')
    if (!desc) return setError('Please add a brief description.')
    setIsPending(true)
    const res = await createAnchor({
      businessValue: Number(amount),
      description: desc,
      closedDate: new Date(date),
      giverId: from
    })
    setIsPending(false)
    if (!res.success) return setError(res.error ?? 'Something went wrong.')
    play('se2')
    setFrom('')
    setAmount('')
    setDesc('')
    setDate(new Date().toISOString().split('T')[0])
    onSuccess()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      accentColor="#34d399"
      tag="Thank You for"
      tagColor="#059669"
      title="Closed Business"
      submitLabel="Submit"
      onSubmit={handleSubmit}
      pending={isPending}
      error={error}
    >
      <FormField label="Thank you to" id="closed-from">
        <FormSelectField id="closed-from" value={from} onChange={setFrom}>
          <MemberOptions members={members} showOutOfChapterMember />
        </FormSelectField>
      </FormField>
      <FormField label="Amount closed" id="closed-amount">
        <input
          id="closed-amount"
          type="text"
          value={formatAmountInput(amount)}
          onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
          placeholder="0.00"
          inputMode="decimal"
          className={inputCls}
        />
      </FormField>
      <FormField label="Description" id="closed-desc">
        <input
          id="closed-desc"
          type="text"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="Brief description of the business"
          className={inputCls}
        />
      </FormField>
      <FormField label="Date closed" id="closed-date">
        <input
          id="closed-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className={inputCls}
        />
      </FormField>
    </Modal>
  )
}
