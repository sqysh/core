import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import LighthouseRecognitionClient from './LighthouseRecognitionClient'

export const metadata: Metadata = { title: 'Lighthouse recognition', robots: { index: false } }

// An experiment: only on the local development server
export default function LighthouseRecognitionPage() {
  if (process.env.NODE_ENV !== 'development') notFound()
  return <LighthouseRecognitionClient />
}
