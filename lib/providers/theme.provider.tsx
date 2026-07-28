'use client'

import { useEffect, ReactNode } from 'react'
import { useAppStore } from '@/lib/store/appStore'

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const { setIsDark } = useAppStore()

  useEffect(() => {
    const checkTheme = () => {
      const dark =
        document.documentElement.classList.contains('dark') || window.matchMedia('(prefers-color-scheme: dark)').matches
      setIsDark(dark)
    }

    checkTheme()

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', checkTheme)

    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    })

    return () => {
      mediaQuery.removeEventListener('change', checkTheme)
      observer.disconnect()
    }
  }, [setIsDark])

  return <>{children}</>
}
