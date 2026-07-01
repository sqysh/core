import { redirect } from 'next/navigation'
import { auth } from '../lib/auth'
import { StripeProvider } from '../lib/providers/StripeProvider'

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  return <StripeProvider>{children}</StripeProvider>
}
