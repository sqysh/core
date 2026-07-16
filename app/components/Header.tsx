import { store } from '@/app/lib/redux/store'
import { Menu } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { setOpenNavigationDrawer } from '@/app/lib/redux/slices/appSlice'
import { LaunchAppButton } from './common/LaunchAppButton'

export const Header = () => {
  const path = usePathname()

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
        <Link href="/" className={navLinkCls(path === '/')}>
          Home
        </Link>
        <Link href="/platform" className={navLinkCls(path === '/')}>
          Platform
        </Link>
        <Link href="/members" className={navLinkCls(path === '/members')}>
          Members
        </Link>
        <Link href="/application" className={navLinkCls(path === '/application')}>
          Apply
        </Link>
      </nav>

      {/* ── Right side ── */}
      <div className="flex items-center gap-5">
        <button
          onClick={() => store.dispatch(setOpenNavigationDrawer())}
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
