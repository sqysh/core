'use client'

import { useState } from 'react'
import { useSounds } from '@/lib/hooks/useSounds'
import { ActiveMembershipCard } from './ActiveMembershipCard'
import { NonActiveMembershipCard } from './NonActiveMembershipCard'
import { MembershipSetupProps } from '@/types/membership.types'
import { MembershipPaymentSetupModal } from './MembershipPaymentSetupModal'
import { SectionLabel } from '@/components/_shared/SectionLabel'
import { EditCardModal } from '@/components/member/billing/EditCardModal'

export default function MembershipSetupPanel({ membership }: MembershipSetupProps) {
  const quarterlyDone = !!membership.quarterlyOrder
  const annualDone = !!membership.annualOrder
  const bothDone = annualDone && quarterlyDone
  const { play } = useSounds({ enabled: true })
  const [openEditCardModal, setOpenEditCardModal] = useState(false)

  return (
    <>
      <EditCardModal
        open={openEditCardModal}
        onClose={() => {
          play('se10')
          setOpenEditCardModal(false)
        }}
        currentPaymentMethod={membership.paymentMethod}
      />
      <MembershipPaymentSetupModal />

      <div>
        <SectionLabel>{bothDone ? 'Membership' : 'Membership Setup'}</SectionLabel>

        {bothDone ? (
          <ActiveMembershipCard membership={membership} onEdit={() => setOpenEditCardModal(true)} />
        ) : (
          <NonActiveMembershipCard annualDone={annualDone} play={play} quarterlyDone={quarterlyDone} />
        )}
      </div>
    </>
  )
}
