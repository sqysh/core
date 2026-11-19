'use client'

import dynamic from 'next/dynamic'

// WebGL and the painted canvas textures only exist in the browser
const LighthouseDiorama = dynamic(() => import('./LighthouseDiorama'), { ssr: false })

export default function LighthouseDioramaLoader() {
  return <LighthouseDiorama />
}
