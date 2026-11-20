'use client'

import dynamic from 'next/dynamic'

// WebGL and the painted canvas textures only exist in the browser
const Voyage = dynamic(() => import('./Voyage'), { ssr: false })

export default function VoyageLoader() {
  return <Voyage />
}
