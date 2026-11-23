'use client'

import dynamic from 'next/dynamic'

// WebGL and the generated textures only exist in the browser
const EnvironmentKit = dynamic(() => import('./EnvironmentKit'), { ssr: false })

export default function EnvironmentKitLoader() {
  return <EnvironmentKit />
}
