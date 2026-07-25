'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSounds } from '@/app/lib/hooks/useSounds'
import { ACTIONS } from '@/app/lib/constants/member/dashboard.constants'
import { ModalKey, QuickActionsProps } from '@/types/dashboard.types'
import { QuickActionButton } from './QuickActionButton'
import { ReferralModal } from './modals/ReferralModal'
import { ClosedBusinessModal } from './modals/ClosedBusinessModal'
import { F2FModal } from './modals/F2FModal'

export default function QuickActions({ members, variant }: QuickActionsProps) {
  const [activeModal, setActiveModal] = useState<ModalKey>(null)
  const router = useRouter()
  const { play } = useSounds({ enabled: true, volume: 0.4 })

  const searchParams = useSearchParams()
  useEffect(() => {
    const action = searchParams.get('action')
    if (action === 'f2f' || action === 'referral' || action === 'closed') setActiveModal(action)
  }, [searchParams])

  function openModal(key: ModalKey) {
    play('se9')
    setActiveModal(key)
  }
  function closeModal() {
    play('se10')
    setActiveModal(null)
  }
  function onSuccess() {
    router.refresh()
    closeModal()
  }

  return (
    <>
      <div className={variant === 'card' ? 'flex flex-col gap-3' : 'grid grid-cols-1 xs:grid-cols-3 gap-3 mb-6'}>
        {ACTIONS.map((a) => (
          <QuickActionButton key={a.key} action={a} onClick={() => openModal(a.key)} />
        ))}
      </div>

      {activeModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={closeModal}
          className="fixed inset-0 z-40 backdrop-blur-sm"
          style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}
        />
      )}

      <F2FModal open={activeModal === 'f2f'} members={members} onClose={closeModal} onSuccess={onSuccess} />
      <ReferralModal open={activeModal === 'referral'} members={members} onClose={closeModal} onSuccess={onSuccess} />
      <ClosedBusinessModal
        open={activeModal === 'closed'}
        members={members}
        onClose={closeModal}
        onSuccess={onSuccess}
      />
    </>
  )
}
