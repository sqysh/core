import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import LODCompare from './LodCompare'

export const metadata: Metadata = { title: 'LOD compare', robots: { index: false } }

/** The LOD comparison workshop: development only, so production answers with a 404 */
export default function LODComparePage() {
  if (process.env.NODE_ENV === 'production') notFound()
  return <LODCompare />
}
