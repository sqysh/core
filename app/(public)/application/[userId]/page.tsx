'use server'

import { notFound } from 'next/navigation'
import ApplicationConfirmationClient from '@/app/(public)/application/[userId]/ApplicationConfirmationClient'
import { getApplicant } from '@/lib/actions/user/getApplicant'

export default async function ApplicationConfirmationPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params
  const result = await getApplicant(userId)

  // no such applicant is a 404, not a crash
  if (!result.success || !result.data) notFound()

  return <ApplicationConfirmationClient application={result.data} />
}
