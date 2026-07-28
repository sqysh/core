'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export const Footer = () => {
  const path = usePathname()

  const linkCls = (active: boolean) =>
    `text-f10 font-mono tracking-[0.15em] uppercase transition-colors duration-150 ${
      active ? 'text-primary-dark' : 'text-on-dark hover:text-text-dark'
    }`

  return (
    <footer className="bg-navbar-light dark:bg-navbar-dark border-t border-border-dark">
      <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Logo */}
        <Link
          href="/"
          className="font-sora font-black text-base text-text-dark hover:text-primary-dark transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-dark"
          aria-label="Coastal Referral Exchange — Home"
        >
          CORE<span className="text-primary-dark">.</span>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-6" aria-label="Footer navigation">
          <Link href="/" className={linkCls(path === '/')}>
            Home
          </Link>
          <Link href="/members" className={linkCls(path === '/members')}>
            Members
          </Link>
          <Link href="/application" className={linkCls(path === '/application')}>
            Apply
          </Link>
          <Link href="/login" className={linkCls(false)}>
            Launch App
          </Link>
        </nav>

        {/* Right — Facebook + copyright */}
        <div className="flex items-center gap-4">
          <a
            href="https://www.facebook.com/profile.php?id=61580349661260"
            target="_blank"
            rel="noopener noreferrer"
            className="w-7 h-7 flex items-center justify-center border border-border-dark text-on-dark hover:text-primary-dark hover:border-primary-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-dark"
            aria-label="Coastal Referral Exchange on Facebook"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
          </a>
          <p className="text-f10 font-mono tracking-widest text-on-dark/50 block">
            © {new Date().getFullYear()} ·{' '}
            <a
              href="https://sqysh.com?cameFrom=core"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-dark hover:text-text-dark transition-colors"
            >
              Sqysh
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
