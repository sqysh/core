import PublicMemberClient from '@/app/(public)/members/[userId]/PublicMemberClient'
import { getMemberProfile } from '@/app/lib/actions/user/getMemberProfile'
import { getUsers } from '@/app/lib/actions/user/getUsers'

export default async function PublicMemberPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params
  const [user, users] = await Promise.all([getMemberProfile(userId), getUsers()])
  return <PublicMemberClient user={user} users={users?.data} />
}
