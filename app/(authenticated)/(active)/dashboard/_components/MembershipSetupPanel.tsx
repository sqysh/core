'use client'

import { useSounds } from '@/lib/hooks/useSounds'
import { NonActiveMembershipCard } from './NonActiveMembershipCard'
import { MembershipSetupProps } from '@/types/membership.types'

export default function MembershipSetupPanel({ membership }: MembershipSetupProps) {
  const annualDone = !!membership.annualOrder
  const quarterlyDone = !!membership.quarterlyOrder
  const { play } = useSounds({ enabled: true })
  if (annualDone && quarterlyDone) return null

  return <NonActiveMembershipCard play={play} annualDone={annualDone} quarterlyDone={quarterlyDone} />
}
