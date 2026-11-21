import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth/auth'
import { loadHarbor } from '../checkin-voyage/_lib/loadHarbor'
import InvisibleQrClient from './InvisibleQrClient'

export const metadata: Metadata = { title: 'Invisible QR test', robots: { index: false } }
export const dynamic = 'force-dynamic'

// An experiment, on the check-in voyage's own data and with its own sign-in rule: the local dev server skips sign-in,
// anywhere else it's signed-in only.
export default async function InvisibleQrPage() {
  // an experiment: only on the local development server
  if (process.env.NODE_ENV !== 'development') notFound()
  const session = await auth()
  if (!session?.user && process.env.NODE_ENV !== 'development') redirect('/login?callbackUrl=%2Fdev%2Finvisible-qr')

  return <InvisibleQrClient {...await loadHarbor()} />
}
