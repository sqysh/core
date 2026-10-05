'use client'

import ThemeProvider from '@/lib/providers/theme.provider'
import { Footer } from '../components/layout/Footer'
import NavigationDrawer from '../components/layout/NavigationDrawer'
import GuidingLightListener from '../components/layout/GuidingLightListener'
import ElectionListener from '@/components/layout/ElectionListener'

export default function RootLayoutWrapper({ children }) {
  return (
    <ThemeProvider>
      <GuidingLightListener />
      <ElectionListener />
      <NavigationDrawer />
      {children}
      <Footer />
    </ThemeProvider>
  )
}
