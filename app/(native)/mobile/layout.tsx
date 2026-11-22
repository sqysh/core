import type { ReactNode } from 'react'

/**
 * The native app's screens. Everything here is for the Capacitor iOS shell (see capacitor.config.ts); shared mobile
 * components and hooks live beside the screens in _components and _hooks. The site's root layout still wraps these pages.
 * The CORENative user agent only decides what to present; it is never used to allow or deny anything.
 */
export default function MobileLayout({ children }: { children: ReactNode }) {
  return children
}
