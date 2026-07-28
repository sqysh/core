// ─── Status badge ──────────────────────────────────────────────────────────────
const SUPER_DASH_STATUS_COLORS: Record<string, string> = {
  REQUESTED: 'bg-amber-400/10 text-amber-500 dark:text-amber-400',
  CONFIRMED: 'bg-sky-400/10 text-sky-600 dark:text-sky-400',
  COMPLETED: 'bg-emerald-400/10 text-emerald-600 dark:text-emerald-400',
  CANCELLED: 'bg-red-400/10 text-red-500 dark:text-red-400',
  GIVEN: 'bg-sky-400/10 text-sky-600 dark:text-sky-400',
  CONTACTED: 'bg-amber-400/10 text-amber-500 dark:text-amber-400',
  CLOSED: 'bg-emerald-400/10 text-emerald-600 dark:text-emerald-400',
  REPORTED: 'bg-amber-400/10 text-amber-500 dark:text-amber-400',
  VERIFIED: 'bg-emerald-400/10 text-emerald-600 dark:text-emerald-400',
  DISPUTED: 'bg-red-400/10 text-red-500 dark:text-red-400',
  ACTIVE: 'bg-emerald-400/10 text-emerald-600 dark:text-emerald-400',
  PENDING: 'bg-amber-400/10 text-amber-500 dark:text-amber-400',
  INACTIVE: 'bg-red-400/10 text-red-500 dark:text-red-400'
}

export function SuperDashStatusBadge({ status }: { status: string }) {
  return status ? (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-f9 font-mono tracking-[0.15em] uppercase ${SUPER_DASH_STATUS_COLORS[status] ?? 'bg-slate-100 dark:bg-slate-800 text-muted-light dark:text-muted-dark'}`}
    >
      {status}
    </span>
  ) : null
}
