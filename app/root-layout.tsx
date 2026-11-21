'use client'

import ThemeProvider from '@/lib/providers/theme.provider'
import { Footer } from '@/components/layout/Footer'
import NavigationDrawer from '@/components/layout/NavigationDrawer'
import { ClientErrorReporter } from '@/components/_shared/ClientErrorReporter'
import { CameraButton } from '@/components/_shared/CameraButton'

export default function RootLayoutWrapper({ children }) {
  return (
    <ThemeProvider>
      <ClientErrorReporter />
      <NavigationDrawer />
      {children}
      <Footer />
      <CameraButton />
    </ThemeProvider>
  )
}
