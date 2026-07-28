export function StatCard({
  label,
  value,
  sub,
  highlight,
  icon
}: {
  label: string
  value: string
  sub?: string
  highlight?: boolean
  icon?: React.ReactNode
}) {
  return (
    <div
      className={`border p-3 sm:p-4 ${
        highlight
          ? 'border-primary-light dark:border-primary-dark bg-primary-light/5 dark:bg-primary-dark/5'
          : 'border-border-light dark:border-border-dark bg-bg-light dark:bg-surface-dark'
      }`}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        {icon}
        <p className="text-[9px] sm:text-f10 font-mono tracking-[0.15em] uppercase text-muted-light dark:text-muted-dark">
          {label}
        </p>
      </div>
      <p
        className={`font-sora font-black text-2xl sm:text-3xl leading-none ${
          highlight ? 'text-primary-light dark:text-primary-dark' : 'text-text-light dark:text-text-dark'
        }`}
      >
        {value}
      </p>
      {sub && (
        <p className="text-[10px] sm:text-[11px] font-mono text-muted-light dark:text-muted-dark mt-1.5">{sub}</p>
      )}
    </div>
  )
}
