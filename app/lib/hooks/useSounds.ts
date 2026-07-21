import { useCallback, useRef, useEffect } from 'react'

const SOUND_PATHS = {
  se0: '/sound-effects/se-0.mp3',
  se1: '/sound-effects/se-1.mp3',
  se2: '/sound-effects/se-2.mp3',
  se3: '/sound-effects/se-3.mp3',
  se4: '/sound-effects/se-4.mp3',
  se5: '/sound-effects/se-5.mp3',
  se6: '/sound-effects/se-6.mp3',
  se7: '/sound-effects/se-7.mp3',
  se8: '/sound-effects/se-8.mp3',
  se9: '/sound-effects/se-9.mp3',
  se10: '/sound-effects/se-10.mp3',
  se11: '/sound-effects/se-11.mp3',
  se12: '/sound-effects/se-12.mp3',
  se13: '/sound-effects/se-13.mp3',
  se14: '/sound-effects/se-14.mp3',
  se15: '/sound-effects/se-15.mp3',
  spin: '/sound-effects/wof/spin.mp3'
} as const

type SoundKey = keyof typeof SOUND_PATHS

interface UseSoundsOptions {
  enabled?: boolean
  volume?: number // 0 to 1
}

export const useSounds = ({ enabled = true, volume = 1 }: UseSoundsOptions = {}) => {
  const soundsRef = useRef<Partial<Record<SoundKey, HTMLAudioElement>>>({})

  useEffect(() => {
    return () => {
      // Cleanup: pause and release any loaded audio
      Object.values(soundsRef.current).forEach((audio) => {
        audio?.pause()
        if (audio) audio.src = ''
      })
      soundsRef.current = {}
    }
  }, [])

  const play = useCallback(
    (key: SoundKey) => {
      if (!enabled) return

      let audio = soundsRef.current[key]

      // Lazy-create on first play
      if (!audio) {
        audio = new Audio(SOUND_PATHS[key])
        audio.preload = 'auto'
        soundsRef.current[key] = audio
      }

      // Update volume in case it changed since last play
      audio.volume = volume

      // Reset to start — allows rapid retriggering without waiting for the previous play to end
      audio.currentTime = 0

      // play() returns a Promise that rejects if the browser blocks autoplay
      audio.play().catch(() => {
        // Silently ignore — usually means the user hasn't interacted with the page yet
        // and the browser is blocking autoplay. Sounds will work after first user gesture.
      })
    },
    [enabled, volume]
  )

  return { play }
}
