'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { getPusherClient, releaseChannel } from '@/lib/pusher/pusherClient'
import { useSounds } from '@/lib/hooks/useSounds'
import { FloatingEmojiEl } from '@/components/_shared/FloatingEmoji'
import { REACTIONS_CHANNEL, REACTIONS_EVENT } from '@/lib/constants/reactions.constants'
import type { FloatingEmoji } from '@/types/attendance.types'

// Keeps a full room of thumbs from burying the screen (or the TV's browser)
const MAX_FLOATERS = 40

// One chime per burst of reactions, not one per emoji, so a room tapping at once doesn't turn to noise
const SOUND_GAP_MS = 150

// A ring that blooms where an emoji launches, so a reaction landing on the TV reads differently from the phone's tap
function Burst({ x, onDone }: { x: number; onDone: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0.7, scale: 0.2 }}
      animate={{ opacity: 0, scale: 2.6 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
      onAnimationComplete={onDone}
      className="fixed bottom-32 z-50 h-[8vw] w-[8vw] -translate-x-1/2 rounded-full border-4 border-primary-dark pointer-events-none"
      style={{ left: `${x}%` }}
    />
  )
}

// Emoji sent from members' phones float up over whatever the TV is showing
export function ReactionOverlay() {
  const [floaters, setFloaters] = useState<FloatingEmoji[]>([])
  const [bursts, setBursts] = useState<{ id: string; x: number }[]>([])
  const { play } = useSounds({ volume: 0.6 })
  const lastSound = useRef(0)

  useEffect(() => {
    const channel = getPusherClient().subscribe(REACTIONS_CHANNEL)

    const onReaction = (data: { emoji: string }) => {
      if (!data?.emoji) return
      const id = `${Date.now()}-${Math.random()}`
      const x = 5 + Math.random() * 90
      setFloaters((prev) => [...prev.slice(-(MAX_FLOATERS - 1)), { id, emoji: data.emoji, x }])
      setBursts((prev) => [...prev.slice(-(MAX_FLOATERS - 1)), { id, x }])

      const now = Date.now()
      if (now - lastSound.current > SOUND_GAP_MS) {
        lastSound.current = now
        play('ui-primary')
      }
    }

    channel.bind(REACTIONS_EVENT, onReaction)
    return () => {
      channel.unbind(REACTIONS_EVENT, onReaction)
      releaseChannel(REACTIONS_CHANNEL)
    }
  }, [play])

  return (
    <>
      <AnimatePresence>
        {floaters.map((f) => (
          <FloatingEmojiEl
            key={f.id}
            emoji={f.emoji}
            x={f.x}
            size="text-[5vw]"
            onDone={() => setFloaters((prev) => prev.filter((fl) => fl.id !== f.id))}
          />
        ))}
      </AnimatePresence>
      <AnimatePresence>
        {bursts.map((b) => (
          <Burst key={b.id} x={b.x} onDone={() => setBursts((prev) => prev.filter((bu) => bu.id !== b.id))} />
        ))}
      </AnimatePresence>
    </>
  )
}
