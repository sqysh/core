import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import LighthouseDioramaLoader from './LighthouseDioramaLoader'

export const metadata: Metadata = { title: 'Lighthouse diorama', robots: { index: false } }

/** The lighthouse diorama workshop: development only, so production answers with a 404 */
export default function LighthouseDioramaPage() {
  if (process.env.NODE_ENV === 'production') notFound()
  return <LighthouseDioramaLoader />
}
