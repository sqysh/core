'use client'
import { useEffect, useRef } from 'react'
import { mountEducation } from './educationRenderer'

/** Widescreen dawn-lantern scene for the Education moment. Fills its parent (ideally 16:9). */
export default function EducationTV({ animated = true, className = '', style = {} }) {
  const ref = useRef(null),
    player = useRef(null)
  useEffect(() => {
    player.current = mountEducation(ref.current, { animated })
    return () => {
      player.current?.destroy()
      player.current = null
    }
  }, [])
  useEffect(() => {
    player.current?.setAnimated(animated)
  }, [animated])
  return (
    <canvas
      ref={ref}
      className={className}
      style={{ display: 'block', width: '100%', height: '100%', aspectRatio: '16 / 9', ...style }}
      role="img"
      aria-label="Animated dawn scene with a glowing lantern over moving water and rising motes of light"
    />
  )
}
