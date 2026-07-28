'use client'

import { Menu } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAppStore } from '@/lib/store/appStore'
import { LaunchAppButton } from './LaunchAppButton'

const NAV_LINKS = [
  { name: 'Home', href: '/' },
  { name: 'Platform', href: '/platform' },
  { name: 'Members', href: '/members' },
  { name: 'Apply', href: '/application' }
]

export default function Header() {
  const path = usePathname()
  const { openNavigationDrawer } = useAppStore()

  const navLinkCls = (active: boolean) =>
    `text-sm font-mono font-semibold tracking-[0.15em] uppercase transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-dark focus-visible:ring-offset-2 ${
      active ? 'text-primary-dark' : 'text-on-dark hover:text-text-dark'
    }`

  return (
    <div
      className={`${
        path === '/' ? 'bg-transparent' : 'bg-navbar-light dark:bg-navbar-dark'
      } flex items-center justify-between px-6 h-18.5 relative z-20`}
    >
      {/* ── Logo ── */}
      <Link
        href="/"
        className="font-sora font-black text-xl text-text-dark tracking-tight hover:text-primary-dark transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-dark"
        aria-label="Coastal Referral Exchange — Home"
      >
        CORE<span className="text-primary-dark">.</span>
      </Link>

      {/* ── Center nav ── */}
      <nav
        className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center gap-8"
        aria-label="Main navigation"
      >
        {NAV_LINKS.map((link) => (
          <Link key={link.href} href={link.href} className={navLinkCls(path === link.href)}>
            {link.name}
          </Link>
        ))}
      </nav>

      {/* ── Right side ── */}
      <div className="flex items-center gap-5">
        <button
          onClick={openNavigationDrawer}
          className="block md:hidden text-on-dark hover:text-text-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-dark"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        {path !== '/login' && <LaunchAppButton />}
      </div>
    </div>
  )
}
