'use client'

import dynamic from 'next/dynamic'

// WebGL and the GLB loader only exist in the browser
const HarborEditor = dynamic(() => import('./HarborEditor'), { ssr: false })

export default function HarborBuilderLoader() {
  return <HarborEditor />
}
