import { PublicMembersClient } from '@/app/(public)/members/PublicMembersClient'
import { getUsers } from '@/app/lib/actions/user/getUsers'

export const dynamic = 'force-dynamic'

export default async function PublicMembersPage() {
  const result = await getUsers()
  return <PublicMembersClient data={result?.data} />
}
