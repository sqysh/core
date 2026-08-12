import { LaunchAppButton } from '@/components/layout/LaunchAppButton'
import { useAppStore } from '@/lib/store/appStore'
import { Menu } from 'lucide-react'
import Link from 'next/link'

const navLinkCls = (active: boolean) =>
  `text-f10 font-mono tracking-[0.2em] uppercase transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
    active ? 'text-white' : 'text-white/50 hover:text-white'
  }`

export default function EmbeddedHeader() {
  const { openNavigationDrawer } = useAppStore()
  return (
    <div className="absolute inset-x-0 top-0 z-30 flex items-center justify-between px-3 sm:px-6 h-14 sm:h-18.5">
      <Link
        href="/"
        className="font-sora font-black text-lg sm:text-xl text-white tracking-tight hover:text-white/80 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        aria-label="Coastal Referral Exchange — Home"
      >
        CORE<span className="text-primary-dark">.</span>
      </Link>

      <nav
        className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center gap-8"
        aria-label="Main navigation"
      >
        <Link href="/" className={navLinkCls(true)}>
          Home
        </Link>
        <Link href="/platform" className={navLinkCls(true)}>
          Platform
        </Link>
        <Link href="/members" className={navLinkCls(false)}>
          Members
        </Link>
        <Link href="/visitors-welcome" className={navLinkCls(false)}>
          Visitors
        </Link>
        <Link href="/application" className={navLinkCls(false)}>
          Apply
        </Link>
      </nav>

      <div className="flex items-center gap-2 sm:gap-5">
        <button
          onClick={openNavigationDrawer}
          className="block md:hidden text-white hover:text-white/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <LaunchAppButton />
      </div>
    </div>
  )
}
