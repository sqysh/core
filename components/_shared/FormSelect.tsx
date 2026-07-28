import { ErrorText, FieldLabel } from './FormField'

interface FormSelectProps {
  id: string
  label: string
  required?: boolean
  error?: string
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void
  children: React.ReactNode
  className?: string
}

const selectCls =
  'w-full h-12 bg-white dark:bg-bg-dark border border-slate-300 dark:border-border-dark px-3.5 font-nunito text-[15px] text-text-light dark:text-text-dark placeholder:text-slate-400 dark:placeholder:text-muted-dark/50 focus:outline-none focus:border-primary-light dark:focus:border-primary-dark focus:ring-1 focus:ring-primary-light/20 dark:focus:ring-primary-dark/20 transition-colors rounded-none'

export function FormSelect({ id, label, required, error, value, onChange, children, className }: FormSelectProps) {
  return (
    <div>
      <FieldLabel htmlFor={id} required={required}>
        {label}
      </FieldLabel>
      <select
        id={id}
        name={id}
        value={value ?? ''}
        onChange={onChange}
        aria-required={required}
        aria-invalid={!!error}
        className={className ?? selectCls}
      >
        {children}
      </select>
      {error && <ErrorText error={error} />}
    </div>
  )
}
