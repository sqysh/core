'use client'

import { useEffect, ReactNode } from 'react'
import { store } from '../redux/store'
import { setIsDark } from '../redux/slices/appSlice'

export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Check initial preference
    const checkTheme = () => {
      const dark =
        document.documentElement.classList.contains('dark') || window.matchMedia('(prefers-color-scheme: dark)').matches
      store.dispatch(setIsDark(dark))
    }

    checkTheme()

    // Listen for system preference changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => checkTheme()

    mediaQuery.addEventListener('change', handleChange)

    // Listen for manual class changes (if you add toggle later)
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    })

    return () => {
      mediaQuery.removeEventListener('change', handleChange)
      observer.disconnect()
    }
  }, [])

  return <>{children}</>
}
