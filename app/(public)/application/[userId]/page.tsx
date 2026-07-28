'use server'

import ApplicationConfirmationClient from '@/app/(public)/application/[userId]/ApplicationConfirmationClient'
import { getApplicant } from '@/lib/actions/user/getApplicant'

export default async function ApplicationConfirmationPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params
  const result = await getApplicant(userId)

  return <ApplicationConfirmationClient application={result.data} />
}
