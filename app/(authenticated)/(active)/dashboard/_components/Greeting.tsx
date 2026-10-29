'use client'

import { useState } from 'react'
import { signOut, useSession } from 'next-auth/react'
import { Home, LayoutDashboard, LogOut, ShieldCheck, UserCircle, Loader2, LucideIcon, Receipt } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { getTodayLabel } from '@/lib/utils/date.utils'
import { getGreeting } from '@/lib/utils/shared.utils'
import { LinkBody } from '@/components/_shared/LinkBody'

const sharedCls =
  'flex items-center gap-2 h-11 px-4 border text-[14px] font-mono tracking-normal whitespace-nowrap shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark'

const idleCls =
  'border-border-light dark:border-border-dark text-text-light dark:text-text-dark hover:text-primary-light dark:hover:text-primary-dark hover:border-primary-light dark:hover:border-primary-dark'

const activeCls =
  'border-primary-light dark:border-primary-dark text-primary-light dark:text-primary-dark bg-primary-light/10 dark:bg-primary-dark/10 font-bold'

export function Greeting({
  currentUser,
  showBilling = false
}: {
  currentUser: { name: string }
  showBilling?: boolean
}) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [signingOut, setSigningOut] = useState(false)

  const firstName = currentUser.name.split(' ')[0]
  const role = session?.user?.role
  const isAdmin = role === 'ADMIN'
  const isSuperUser = role === 'SUPER_USER'

  const links: { href: string; label: string; icon: LucideIcon; show: boolean }[] = [
    { href: '/', label: 'Home', icon: Home, show: true },
    { href: '/profile', label: 'Profile', icon: UserCircle, show: true },
    { href: '/billing', label: 'Billing', icon: Receipt, show: showBilling },
    { href: '/admin', label: 'Admin', icon: LayoutDashboard, show: isAdmin || isSuperUser },
    { href: '/super/dashboard', label: 'Super', icon: ShieldCheck, show: isSuperUser }
  ]

  async function handleSignOut() {
    setSigningOut(true)
    try {
      await signOut({ redirectTo: '/login' })
    } catch {
      setSigningOut(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 pr-2">
          <p className="text-f10 font-mono tracking-[0.12em] uppercase text-primary-light dark:text-primary-dark mb-1.5">
            {getTodayLabel()}
          </p>
          <h1 className="font-black text-[26px] xs:text-[30px] sm:text-[34px] text-text-light dark:text-text-dark tracking-tight leading-[1.1] truncate">
            {getGreeting()}, {firstName}.
          </h1>
        </div>

        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="shrink-0 w-11 h-11 -mr-2 flex items-center justify-center text-muted-light dark:text-muted-dark hover:text-text-light dark:hover:text-text-dark transition-colors disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark"
          aria-label="Sign out"
        >
          {signingOut ? <Loader2 size={20} className="animate-spin" /> : <LogOut size={20} />}
        </button>
      </div>

      <nav className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-4 px-4" aria-label="Primary">
        {links
          .filter((l) => l.show)
          .map(({ href, label, icon: Icon }) => {
            const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`${sharedCls} ${active ? activeCls : idleCls}`}
              >
                <LinkBody icon={<Icon className="w-4 h-4" />} label={label} spinnerClass="w-4 h-4" />
              </Link>
            )
          })}
      </nav>
    </div>
  )
}
