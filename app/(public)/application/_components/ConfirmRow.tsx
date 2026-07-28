export function ConfirmRow({
  icon: Icon,
  label,
  value
}: {
  icon: React.ElementType
  label: string
  value: string | null | undefined
}) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3 py-3.5 border-b border-border-light dark:border-border-dark last:border-0">
      <div className="w-7 h-7 shrink-0 flex items-center justify-center bg-primary-light/10 dark:bg-primary-dark/10 border border-primary-light/20 dark:border-primary-dark/20 mt-0.5">
        <Icon size={13} className="text-primary-light dark:text-primary-dark" aria-hidden="true" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-f10 font-mono tracking-[0.15em] uppercase text-muted-light dark:text-muted-dark mb-0.5">
          {label}
        </p>
        <p className="text-[14px] font-nunito text-text-light dark:text-text-dark wrap-break-word">{value}</p>
      </div>
    </div>
  )
}
