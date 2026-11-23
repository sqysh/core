'use client'

import { glassButton } from '@/components/_shared/LiquidGlass'
import { CAMERA_MS } from './_components/launchMotion'
import { LaunchBackground } from './LaunchBackground'
import { LaunchLogo } from './LaunchLogo'
import { SignInOptions } from './SignInOptions'
import { useLaunchStage } from './useLaunchStage'
import { useLockedPage } from '../_hooks/useLockedPage'

/**
 * Fullscreen and fixed: nothing scrolls. Sign In stays on this screen: the landing fades, the camera travels from
 * the lighthouse down to the inlet, and the sign-in choices arrive over the same harbor; Back reverses the journey. Controls keep to the safe areas
 * and clear of the global camera button (bottom right).
 */
export function LaunchScreen() {
  useLockedPage()
  const { stage, go } = useLaunchStage()
  const signingIn = stage === 'signIn'

  return (
    <main className="fixed inset-0 z-30 flex touch-none flex-col items-center justify-between overflow-hidden overscroll-none select-none px-[max(1.5rem,env(safe-area-inset-left))] pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <LaunchBackground signingIn={signingIn} />
      {/* above the lighthouse, which holds the middle of the screen */}
      <div
        className={`relative pt-[6vh] transition-opacity duration-300 ${signingIn ? 'opacity-0' : 'opacity-100'}`}
        style={{ transitionDelay: signingIn ? '0ms' : `${CAMERA_MS - 400}ms` }}
      >
        <LaunchLogo />
      </div>
      <div className="flex-1" />
      <button
        type="button"
        onClick={() => go('signIn')}
        tabIndex={signingIn ? -1 : undefined}
        aria-hidden={signingIn}
        // fades out at once; on the way back it returns as the camera arrives
        style={{ transitionDelay: signingIn ? '0ms' : `${CAMERA_MS - 400}ms` }}
        className={`${glassButton('primary')} relative h-14 w-full max-w-sm text-base transition-opacity! duration-300 ${
          signingIn ? 'pointer-events-none opacity-0' : 'opacity-100'
        }`}
      >
        Sign In
      </button>
      <SignInOptions shown={signingIn} onBack={() => go('landing')} />
    </main>
  )
}
