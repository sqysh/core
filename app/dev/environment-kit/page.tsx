import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import EnvironmentKitLoader from './EnvironmentKitLoader'

export const metadata: Metadata = { title: 'Environment kit', robots: { index: false } }

/** The environment asset workshop: development only, so production answers with a 404 */
export default function EnvironmentKitPage() {
  if (process.env.NODE_ENV === 'production') notFound()
  return <EnvironmentKitLoader />
}
