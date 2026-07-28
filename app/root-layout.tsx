'use client'

import ThemeProvider from '@/lib/providers/theme.provider'
import { Footer } from '../components/layout/Footer'
import NavigationDrawer from '../components/layout/NavigationDrawer'
import { usePathname } from 'next/navigation'

const showLink = (path: string) =>
  ![
    '/admin',
    '/members',
    '/application',
    '/login',
    '/dashboard',
    '/super',
    '/profile',
    '/onboarding',
    '/visitor-day',
    '/visitor',
    '/attendance',
    '/check-in',
    '/events'
  ].some((str) => path.includes(str))

export default function RootLayoutWrapper({ children }) {
  const path = usePathname()

  return (
    <ThemeProvider>
      <NavigationDrawer />
      {children}
      {showLink(path) && <Footer />}
    </ThemeProvider>
  )
}
