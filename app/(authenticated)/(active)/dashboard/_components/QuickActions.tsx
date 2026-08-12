'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter, useSearchParams } from 'next/navigation'
import { Member, ModalKey } from '@/types/dashboard.types'
import { ReferralModal } from './ReferralModal'
import { ClosedBusinessModal } from './ClosedBusinessModal'
import { F2FModal } from './F2FModal'

export interface QuickActionsProps {
  members: Member[]
  variant: 'card' | 'compact'
  initialModal: any
  onModalClose: () => void
}

export default function QuickActions({ members, variant, initialModal, onModalClose }: QuickActionsProps) {
  const [activeModal, setActiveModal] = useState<ModalKey>(initialModal ?? null)
  const router = useRouter()

  const searchParams = useSearchParams()

  useEffect(() => {
    const action = searchParams.get('action')
    if (action === 'f2f' || action === 'referral' || action === 'closed') setActiveModal(action)
  }, [searchParams])

  useEffect(() => {
    if (initialModal) setActiveModal(initialModal)
  }, [initialModal])

  function closeModal() {
    setActiveModal(null)
    onModalClose?.()
  }
  function onSuccess() {
    router.refresh()
    closeModal()
  }

  return (
    <>
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
