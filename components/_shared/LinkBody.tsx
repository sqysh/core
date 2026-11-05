'use client'

import { useLinkStatus } from 'next/link'
import { Loader2 } from 'lucide-react'

interface BodyProps {
  icon?: React.ReactNode
  label?: string
  children?: React.ReactNode
  spinnerClass?: string
  iconAfter?: boolean
  showSpinnerWithoutIcon?: boolean
}

function Body({
  icon,
  label,
  children,
  spinnerClass = 'w-3 h-3',
  iconAfter = false,
  showSpinnerWithoutIcon = false,
  pending
}: BodyProps & { pending: boolean }) {
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

export function LinkBody(props: BodyProps) {
  const { pending } = useLinkStatus()
  return <Body {...props} pending={pending} />
}

export function ActionBody(props: BodyProps & { pending: boolean }) {
  return <Body {...props} />
}
