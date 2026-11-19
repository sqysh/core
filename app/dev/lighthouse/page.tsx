import type { Metadata } from 'next'
import LighthouseDioramaLoader from './LighthouseDioramaLoader'

export const metadata: Metadata = { title: 'Lighthouse diorama', robots: { index: false } }

export default function LighthouseDioramaPage() {
  return <LighthouseDioramaLoader />
}
