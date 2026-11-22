'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Camera } from 'lucide-react'
import { CameraOverlay, ScanOutcome } from '@/components/_shared/CameraOverlay'
import { checkIn } from '@/lib/actions/attendance/checkIn'
import { isCheckInQr } from '@/lib/utils/checkInQr'
import { glassButton } from '@/components/_shared/LiquidGlass'

/** Everywhere: bottom right, above the dashboard's quick-action bar (72px tall with 1rem around it) */
const DEFAULT_SPOT =
  'right-[max(1rem,env(safe-area-inset-right))] bottom-[calc(max(1rem,env(safe-area-inset-bottom))+6.5rem)]'

/**
 * On the Garage the right edge held sideways is the menu, and upright the bottom is its sheet, so the button sits with
 * the boat's own controls instead: beside the reset-view button (bottom left) held sideways, and under it (top right)
 * upright. Both keep to the safe areas.
 */
const GARAGE_SPOT =
  'landscape:left-[calc(max(12px,env(safe-area-inset-left))+56px)] landscape:bottom-[max(64px,calc(env(safe-area-inset-bottom)+12px))] portrait:right-[max(12px,env(safe-area-inset-right))] portrait:top-[calc(max(12px,env(safe-area-inset-top))+112px)]'

/**
 * A floating Liquid Glass camera button, on every page; it opens the camera overlay over whatever page is showing. The glass is
 * tinted dark navy so the white icon reads on light pages and on the bright sea alike.
 */
/**
 * What a scanned code does: CORE's meeting check-in code checks the member in to today's meeting through the same
 * server action as the /check-in page (sign-in, the meeting window, one attendance per meeting and the boat's arrival
 * on the TV are all decided there). Nothing from the code is passed on, so it always means today's meeting. Any other
 * code is turned away, and is never opened.
 */
async function handleScan(text: string): Promise<ScanOutcome> {
  // the development server's own address counts too, so a code made for it can be tried on a phone
  if (!isCheckInQr(text, [window.location.host])) return { tone: 'error', text: 'That isn’t a CORE check-in code.' }
  const res = await checkIn()
  if (res.success && res.alreadyCheckedIn) return { tone: 'ok', text: 'You’re already checked in to today’s meeting.' }
  if (res.success) return { tone: 'ok', text: 'You’re checked in. Your boat is on its way into the harbor.' }
  if (res.error === 'Unauthorized') return { tone: 'error', text: 'Sign in to CORE to check in.' }
  return { tone: 'error', text: res.error ?? 'Check-in failed. Please try again.' }
}

export function CameraButton() {
  const path = usePathname()
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        type="button"
        aria-label="Camera"
        className={`${glassButton()} fixed! z-40 h-14 w-14 rounded-full border-white/40! bg-[#06182c]/60! shadow-[0_4px_16px_rgba(4,16,32,0.3),inset_0_1px_1px_rgba(255,255,255,0.45)] hover:bg-[#06182c]/70! ${
          path.startsWith('/garage') ? GARAGE_SPOT : DEFAULT_SPOT
        }`}
      >
        <Camera size={22} aria-hidden="true" />
      </button>
      {open && <CameraOverlay onClose={() => setOpen(false)} onDetect={handleScan} />}
    </>
  )
}
