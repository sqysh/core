import { Suspense } from 'react'
import { LoginClient } from './LoginClient'
import LoginSkeleton from './_components/LoginSkeleton'

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <LoginClient />
    </Suspense>
  )
}
