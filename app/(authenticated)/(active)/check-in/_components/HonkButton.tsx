'use client'

import { useRef, useState } from 'react'
import { Ship } from 'lucide-react'
import { honkHorn } from '@/lib/actions/attendance/honkHorn'
import { HONK_COOLDOWN_MS } from '@/lib/constants/honk.constants'
import { LIFT, delay } from '@/app/(authenticated)/(active)/check-in/_lib/motion'

// Once you're checked in your boat is in the harbor on the TV. Tap and it sounds its horn.
export function HonkButton({ settle }: { settle: number }) {
  const [honking, setHonking] = useState(false)
  const lastTap = useRef(0)

  function honk() {
    const now = Date.now()
    if (now - lastTap.current < HONK_COOLDOWN_MS) return
    lastTap.current = now

    navigator.vibrate?.(40)
    setHonking(true)
    setTimeout(() => setHonking(false), HONK_COOLDOWN_MS)
    void honkHorn()
  }

  return (
    <div className={`mt-5 opacity-0 ${LIFT}`} style={delay(settle + 2.0)}>
      <p className="m-0 font-mono text-[10px] tracking-[0.18em] uppercase text-white/45">Your boat is in the harbor</p>
      <button
        type="button"
        onClick={honk}
        aria-label="Honk your boat's horn on the TV"
        className={`mt-2 flex h-12 w-full items-center justify-center gap-2.5 border font-sora text-[14px] font-black transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 active:scale-95 ${
          honking ? 'border-(--key) bg-(--key)/15 text-white' : 'border-white/15 bg-white/4 text-white'
        }`}
      >
        <Ship size={18} aria-hidden="true" />
        {honking ? 'Toot toot!' : 'Honk your horn'}
      </button>
    </div>
  )
}
