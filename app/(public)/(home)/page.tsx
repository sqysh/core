import HomeClient from './HomeClient'
import { auth } from '@/lib/auth/auth'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const session = await auth()
  return <HomeClient isAuthed={!!session?.user?.id} />
}
