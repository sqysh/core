'use client'

import ThemeProvider from '@/lib/providers/theme.provider'
import { Footer } from '../components/layout/Footer'
import NavigationDrawer from '../components/layout/NavigationDrawer'

export default function RootLayoutWrapper({ children }) {
  return (
    <ThemeProvider>
      <NavigationDrawer />
      {children}
      <Footer />
    </ThemeProvider>
  )
}
