export function InlineActionBtn({
  onClick,
  disabled,
  variant,
  children
}: {
  onClick: () => void
  disabled: boolean
  variant: 'confirm' | 'cancel' | 'delete' | 'neutral'
  children: React.ReactNode
}) {
  const cls = {
    confirm: 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-400/10',
    cancel: 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-400/10',
    delete: 'text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-400/10',
    neutral: 'text-muted-light dark:text-muted-dark hover:bg-surface-light dark:hover:bg-surface-dark'
  }[variant]

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`h-7 px-2.5 text-f10 font-mono tracking-widest uppercase transition-colors disabled:opacity-40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark ${cls}`}
    >
      {children}
    </button>
  )
}
