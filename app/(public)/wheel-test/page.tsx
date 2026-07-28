'use client'

import Wheel from '@/components/game/wheel/Wheel'
import { useSounds } from '@/lib/hooks/useSounds'
import { wedgeLabel, WHEEL } from '@/types/_wheel.types'
// Standalone wheel playground — no DB, no auth, no game. Just renders the Wheel
// and spins it to a random wedge each click so you can eyeball the animation and
// the landing. Delete this page (or leave it) once you're happy with the look.

import { useEffect, useState } from 'react'

export default function WheelTestPage() {
  const [nonce, setNonce] = useState(0)
  const [target, setTarget] = useState<number | null>(null)
  const [result, setResult] = useState<string>('')
  const [spinning, setSpinning] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [spinSize, setSpinSize] = useState(680)
  const { play } = useSounds()

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    const compute = () => setSpinSize(Math.min(window.innerWidth, window.innerHeight) * 0.82)
    compute()
    window.addEventListener('resize', compute)
    return () => window.removeEventListener('resize', compute)
  }, [])

  function spin() {
    play('spin')
    if (spinning) return
    const idx = Math.floor(Math.random() * WHEEL.length)
    setTarget(idx)
    setResult('')
    setSpinning(true)
    setNonce((n) => n + 1)
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(120% 120% at 50% 40%, #0f2233 0%, #03080d 75%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 28,
        padding: 24
      }}
    >
      {mounted && (
        <Wheel
          targetIndex={target}
          nonce={nonce}
          size={spinSize}
          onSettled={() => {
            setSpinning(false)
            if (target != null) setResult(wedgeLabel(WHEEL[target]))
          }}
        />
      )}

      <div style={{ textAlign: 'center', color: '#fff', fontFamily: 'monospace' }}>
        <button
          onClick={spin}
          disabled={spinning}
          style={{
            padding: '14px 40px',
            fontSize: 18,
            fontWeight: 800,
            background: spinning ? '#1e3a4a' : '#A6FF4D',
            color: spinning ? '#7a8a96' : '#06121b',
            border: 'none',
            cursor: spinning ? 'default' : 'pointer',
            letterSpacing: '0.1em'
          }}
        >
          {spinning ? 'SPINNING…' : 'SPIN'}
        </button>
        <p
          style={{ marginTop: 16, minHeight: 24, fontSize: 22, fontWeight: 800 }}
          className="fixed left-1/2 -translate-x-1/2"
        >
          {result && `Landed on: ${result}`}
        </p>
      </div>
    </div>
  )
}
