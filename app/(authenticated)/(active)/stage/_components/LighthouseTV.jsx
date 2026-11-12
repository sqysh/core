'use client'
import { useEffect, useRef } from 'react'
import { mountLighthouse } from './lighthouseRenderer'

/** Widescreen TV scene. Fills its parent; parent should ideally be 16:9. */
export default function LighthouseTV({ animated = true, className = '', style = {} }) {
  const ref = useRef(null),
    player = useRef(null)
  useEffect(() => {
    const image = new Image()
    image.src = '/images/lighthouse.jpg'
    player.current = mountLighthouse(ref.current, image, { animated })
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
      aria-label="Animated widescreen twilight lighthouse, shimmering ocean, twinkling stars and sweeping beacon"
    />
  )
}
