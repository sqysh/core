import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import WheelTest from './WheelTest'

export const metadata: Metadata = { title: 'Wheel test', robots: { index: false } }

/** The wheel playground: development only, so production answers with a 404 */
export default function WheelTestPage() {
  if (process.env.NODE_ENV === 'production') notFound()
  return <WheelTest />
}
