import { signOut, useSession } from 'next-auth/react'
import { Home, LayoutDashboard, LogOut, ShieldCheck, UserCircle } from 'lucide-react'
import Link from 'next/link'
import { getTodayLabel } from '@/app/lib/utils/date.utils'
import { getGreeting } from '@/app/lib/utils/shared.utils'

const sharedCls =
  'flex items-center gap-1.5 xs:gap-2 h-7 xs:h-8 px-2.5 xs:px-3 sm:px-4 border border-border-light dark:border-border-dark text-[9px] xs:text-[10px] font-mono tracking-[0.12em] uppercase text-muted-light dark:text-muted-dark hover:text-primary-light dark:hover:text-primary-dark hover:border-primary-light dark:hover:border-primary-dark transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark'

export function Greeting({ currentUser }) {
  const session = useSession()
  const firstName = currentUser.name.split(' ')[0]
  const greeting = getGreeting()
  const today = getTodayLabel()
  const isAdmin = session.data?.user?.role === 'ADMIN'
  const isSuperUser = session.data?.user?.role === 'SUPER_USER'

  return (
    <div className="flex flex-col gap-3">
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 pr-2">
          <p className="text-[9px] xs:text-f10 font-mono tracking-[0.18em] uppercase text-primary-light dark:text-primary-dark mb-1">
            {today}
          </p>

          <h1 className="font-black text-[22px] xs:text-[26px] sm:text-[30px] text-text-light dark:text-text-dark tracking-tight leading-[1.1] truncate">
            {greeting}, {firstName}.
          </h1>
        </div>

        {/* ALWAYS top right */}
        <button
          onClick={() => signOut({ redirectTo: '/login' })}
          className="shrink-0 mt-1 text-muted-light dark:text-muted-dark hover:text-text-light dark:hover:text-text-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark"
          aria-label="Sign out"
        >
          <LogOut size={15} />
        </button>
      </div>

      {/* Nav row - NEVER wraps */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
        <Link href="/" className={sharedCls}>
          <Home className="hidden sm:block sm:w-3 sm:h-3" />
          Home
        </Link>

        <Link href="/profile" className={sharedCls}>
          <UserCircle className="hidden sm:block sm:w-3 sm:h-3" />
          Profile
        </Link>

        <Link href="/attendance/history" className={sharedCls}>
          <UserCircle className="hidden sm:block sm:w-3 sm:h-3" />
          Attendance
        </Link>

        {isAdmin && (
          <Link href="/admin" className={sharedCls}>
            <LayoutDashboard className="hidden sm:block sm:w-3 sm:h-3" />
            Admin
          </Link>
        )}

        {isSuperUser && (
          <Link href="/super" className={sharedCls}>
            <ShieldCheck className="hidden sm:block sm:w-3 sm:h-3" />
            Super
          </Link>
        )}
      </div>
    </div>
  )
}
