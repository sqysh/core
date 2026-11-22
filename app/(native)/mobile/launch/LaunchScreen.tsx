'use client'

import Link from 'next/link'
import { glassButton } from '@/components/_shared/LiquidGlass'
import { LaunchBackground } from './LaunchBackground'
import { LaunchLogo } from './LaunchLogo'
import { useLockedPage } from '../_hooks/useLockedPage'

/**
 * Fullscreen and fixed: nothing scrolls. The sign-in button keeps to the safe areas, and sits low enough that the global
 * camera button (bottom right, above the dashboard bar's height) never touches it.
 */
export function LaunchScreen() {
  useLockedPage()
  return (
    <main className="fixed inset-0 z-30 flex touch-none flex-col items-center justify-between overflow-hidden overscroll-none select-none px-[max(1.5rem,env(safe-area-inset-left))] pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <LaunchBackground />
      <div className="relative flex flex-1 items-center">
        <LaunchLogo />
      </div>
      <Link href="/login" className={`${glassButton('primary')} relative h-14 w-full max-w-sm text-base`}>
        Sign In
      </Link>
    </main>
  )
}
