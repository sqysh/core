'use client'

import { ChevronLeft, Mail } from 'lucide-react'
import { ReactNode } from 'react'
import { glassButton } from '@/components/_shared/LiquidGlass'
import { CAMERA_MS } from './_components/launchMotion'
import { AppleIcon, GoogleIcon } from './ProviderIcons'

// The sign-in choices, laid over the inlet (no panel behind them). They arrive one after another as the camera
// settles, and leave together, quickly, when going back. The providers aren't connected yet: native sign-in comes
// separately.

const PROVIDERS: { label: string; icon: ReactNode }[] = [
  { label: 'Continue with Google', icon: <GoogleIcon /> },
  { label: 'Continue with Apple', icon: <AppleIcon /> },
  { label: 'Continue with Email', icon: <Mail size={20} aria-hidden="true" /> }
]

/** Enter: as the camera settles, each option ~90 ms after the last. Leave: all at once. */
const delay = (shown: boolean, i: number) => (shown ? CAMERA_MS - 250 + i * 90 : 0)

const arrive = (shown: boolean) =>
  `transition-[opacity,translate] ease-out motion-reduce:translate-y-0 ${
    shown ? 'translate-y-0 opacity-100 duration-500' : 'pointer-events-none translate-y-3 opacity-0 duration-200'
  }`

export function SignInOptions({ shown, onBack }: { shown: boolean; onBack: () => void }) {
  return (
    <>
      <button
        type="button"
        onClick={onBack}
        aria-label="Back"
        tabIndex={shown ? undefined : -1}
        style={{ transitionDelay: `${delay(shown, 0)}ms` }}
        className={`${glassButton()} ${arrive(shown)} absolute! left-[max(1rem,env(safe-area-inset-left))] top-[max(1rem,env(safe-area-inset-top))] h-11 w-11 rounded-full`}
      >
        <ChevronLeft size={22} aria-hidden="true" />
      </button>

      {/* above the global camera button, which keeps its corner */}
      <div
        aria-hidden={!shown}
        className="absolute inset-x-0 bottom-[calc(max(1rem,env(safe-area-inset-bottom))+10.75rem)] flex flex-col items-center gap-3 px-[max(1.5rem,env(safe-area-inset-left))]"
      >
        {PROVIDERS.map((p, i) => (
          <button
            key={p.label}
            type="button"
            tabIndex={shown ? undefined : -1}
            style={{ transitionDelay: `${delay(shown, i + 1)}ms` }}
            className={`${glassButton()} ${arrive(shown)} h-14 w-full max-w-sm text-base`}
          >
            {p.icon}
            {p.label}
          </button>
        ))}
      </div>
    </>
  )
}
