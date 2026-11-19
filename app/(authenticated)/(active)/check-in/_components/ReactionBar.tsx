'use client'

import { useRef, useState } from 'react'
import { useSounds } from '@/lib/hooks/useSounds'
import { sendStageReaction } from '@/lib/actions/stage/sendStageReaction'
import { REACTION_COOLDOWN_MS, REACTION_EMOJIS } from '@/lib/constants/reactions.constants'
import { LIFT, delay } from '../_lib/motion'

// Tap one and it floats up the TV
export function ReactionBar({ settle }: { settle: number }) {
  const [popped, setPopped] = useState<string | null>(null)
  const lastTap = useRef(0)
  const { play } = useSounds({ volume: 0.5 })

  function react(emoji: string) {
    const now = Date.now()
    if (now - lastTap.current < REACTION_COOLDOWN_MS) return
    lastTap.current = now

    play('ui-tap')
    navigator.vibrate?.(12)
    setPopped(emoji)
    setTimeout(() => setPopped((p) => (p === emoji ? null : p)), 250)
    void sendStageReaction(emoji)
  }

  return (
    <div className={`mt-5 opacity-0 ${LIFT}`} style={delay(settle + 2.2)}>
      <p className="m-0 font-mono text-[10px] tracking-[0.18em] uppercase text-white/45">Tap to react on the TV</p>
      <div className="mt-2 flex justify-center gap-2">
        {REACTION_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => react(emoji)}
            aria-label={`Send ${emoji} to the TV`}
            className={`flex h-11 min-w-0 flex-1 basis-0 items-center justify-center border border-white/15 bg-white/4 text-[20px] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 active:scale-90 ${
              popped === emoji ? 'scale-110 border-(--key)' : ''
            }`}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  )
}
