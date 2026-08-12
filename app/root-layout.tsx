'use client'

import ThemeProvider from '@/lib/providers/theme.provider'
import { Footer } from '../components/layout/Footer'
import NavigationDrawer from '../components/layout/NavigationDrawer'
import GuidingLightListener from '../components/layout/GuidingLightListener'

export default function RootLayoutWrapper({ children }) {
  return (
    <ThemeProvider>
      <GuidingLightListener />
      <NavigationDrawer />
      {children}
      <Footer />
    </ThemeProvider>
  )
}
