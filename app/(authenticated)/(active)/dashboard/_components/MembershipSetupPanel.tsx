'use client'

import { useSounds } from '@/lib/hooks/useSounds'
import { MembershipPaymentSetupModal } from './MembershipPaymentSetupModal'
import { NonActiveMembershipCard } from './NonActiveMembershipCard'
import { MembershipSetupProps } from '@/types/membership.types'

export default function MembershipSetupPanel({ membership }: MembershipSetupProps) {
  const annualDone = !!membership.annualOrder
  const quarterlyDone = !!membership.quarterlyOrder
  const { play } = useSounds({ enabled: true })
  if (annualDone && quarterlyDone) return null

  // The modal opens from the store (this card's button, and "reinstate" in the attendance panel while membership is
  // incomplete): it has to be mounted wherever those buttons are.
  return (
    <>
      <MembershipPaymentSetupModal />
      <NonActiveMembershipCard play={play} annualDone={annualDone} quarterlyDone={quarterlyDone} />
    </>
  )
}
