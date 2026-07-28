import SuperDashMemberEditClient from '@/app/(authenticated)/(active)/super/members/[userId]/SuperDashMemberEditClient'
import { getUserById } from '@/lib/actions/user/getUserById'
import { notFound } from 'next/navigation'

export default async function SuperDashMemberEditPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params
  const result = await getUserById(userId)

  if (!result.success || !result.data) notFound()

  return <SuperDashMemberEditClient member={result.data} />
}
