import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import HarborBuilderLoader from './HarborBuilderLoader'

export const metadata: Metadata = { title: 'Harbor builder', robots: { index: false } }

/** The harbor builder workshop: development only, so production answers with a 404 */
export default function HarborBuilderPage() {
  if (process.env.NODE_ENV === 'production') notFound()
  return <HarborBuilderLoader />
}
