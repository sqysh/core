import { getLeadershipTerms } from '@/lib/actions/leadership/getLeadershipTerms'
import LeadershipClient from './LeadershipClient'

export const dynamic = 'force-dynamic'

export default async function LeadershipPage() {
  const terms = await getLeadershipTerms()
  return <LeadershipClient terms={terms} />
}
