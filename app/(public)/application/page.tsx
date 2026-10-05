import PublicApplicationClient from '@/app/(public)/application/PublicApplicationClient'

import { Suspense } from 'react'

export default function ApplicationPage() {
  return (
    <Suspense>
      <PublicApplicationClient />
    </Suspense>
  )
}
