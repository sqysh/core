'use client'
import { useEffect, useRef } from 'react'
import { mountCoDirectors } from './coDirectorsRenderer'

/** Widescreen blue-hour sailboat scene for the Co-Directors moment. Fills its parent (ideally 16:9). */
export default function CoDirectorsTV({ animated = true, className = '', style = {} }) {
  const ref = useRef(null),
    player = useRef(null)
  useEffect(() => {
    player.current = mountCoDirectors(ref.current, { animated })
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
      aria-label="Animated blue-hour scene with a two-sail boat crossing moving water toward the horizon"
    />
  )
}
