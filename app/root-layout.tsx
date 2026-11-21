'use client'

import ThemeProvider from '@/lib/providers/theme.provider'
import { Footer } from '@/components/layout/Footer'
import NavigationDrawer from '@/components/layout/NavigationDrawer'
import { ClientErrorReporter } from '@/components/_shared/ClientErrorReporter'

export default function RootLayoutWrapper({ children }) {
  return (
    <ThemeProvider>
      <ClientErrorReporter />
      <NavigationDrawer />
      {children}
      <Footer />
    </ThemeProvider>
  )
}
