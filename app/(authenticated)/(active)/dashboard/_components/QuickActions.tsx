'use client'

import { useState } from 'react'
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

function modalFromAction(searchParams: ReturnType<typeof useSearchParams>): ModalKey | null {
  const action = searchParams.get('action')
  return action === 'f2f' || action === 'referral' || action === 'closed' ? action : null
}

export default function QuickActions({ members, variant, initialModal, onModalClose }: QuickActionsProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeModal, setActiveModal] = useState<ModalKey>(
    () => initialModal || modalFromAction(searchParams) || (initialModal ?? null)
  )

  // A new ?action= in the URL or a new initialModal from the parent opens that modal (the parent's wins)
  const [seen, setSeen] = useState({ searchParams, initialModal })
  if (seen.searchParams !== searchParams || seen.initialModal !== initialModal) {
    setSeen({ searchParams, initialModal })
    const next =
      (seen.initialModal !== initialModal && initialModal) ||
      (seen.searchParams !== searchParams && modalFromAction(searchParams)) ||
      activeModal
    if (next !== activeModal) setActiveModal(next)
  }

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
