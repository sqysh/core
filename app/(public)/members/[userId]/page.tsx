import PublicMemberClient from '@/app/(public)/members/[userId]/PublicMemberClient'
import { getEileenListings } from '@/lib/actions/external/getEileenListings'
import { getMemberProfile } from '@/lib/actions/user/getMemberProfile'
import { getUsers } from '@/lib/actions/user/getUsers'

const EILEEN_USER_ID = 'cmizatoyw000fy0u46obnj8ri'

export default async function PublicMemberPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params

  // Only hit jonahgroupre's listings endpoint on Eileen's profile
  const [user, users, listingsResult] = await Promise.all([
    getMemberProfile(userId),
    getUsers(),
    userId === EILEEN_USER_ID ? getEileenListings() : Promise.resolve(null)
  ])

  const eileenListings = listingsResult?.success ? listingsResult.data : []

  return <PublicMemberClient user={user} users={users?.data} eileenListings={eileenListings} />
}
