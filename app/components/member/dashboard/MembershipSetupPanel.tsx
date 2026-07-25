'use client'

import { useState } from 'react'
import { SectionLabel } from '../../_shared/SectionLabel'
import { EditCardModal } from '../billing/EditCardModal'
import { useSounds } from '@/app/lib/hooks/useSounds'
import { ActiveMembershipCard } from './ActiveMembershipCard'
import { NonActiveMembershipCard } from './NonActiveMembershipCard'
import { MembershipSetupProps } from '@/types/membership.types'
import { MembershipPaymentSetupModal } from './modals/MembershipPaymentSetupModal'

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
