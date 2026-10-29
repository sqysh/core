'use client'

import { useLinkStatus } from 'next/link'
import { Loader2 } from 'lucide-react'

export function LinkBody({
  icon,
  label,
  children,
  spinnerClass = 'w-3 h-3',
  iconAfter = false,
  showSpinnerWithoutIcon = false
}: {
  icon?: React.ReactNode
  label?: string
  children?: React.ReactNode
  spinnerClass?: string
  iconAfter?: boolean
  showSpinnerWithoutIcon?: boolean
}) {
  const { pending } = useLinkStatus()

  const hasSlot = icon !== undefined || showSpinnerWithoutIcon
  const glyph = hasSlot ? (
    pending ? (
      <Loader2 className={`${spinnerClass} shrink-0 animate-spin`} aria-hidden="true" />
    ) : (
      (icon ?? <span className={`${spinnerClass} shrink-0`} aria-hidden="true" />)
    )
  ) : null

  return (
    <>
      {!iconAfter && glyph}
      {children ?? label}
      {iconAfter && glyph}
      {pending && <span className="sr-only">Loading</span>}
    </>
  )
}
