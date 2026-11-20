import type { Metadata } from 'next'
import VoyageLoader from './VoyageLoader'

export const metadata: Metadata = { title: 'Voyage prototype', robots: { index: false } }

export default function VoyagePage() {
  return <VoyageLoader />
}
