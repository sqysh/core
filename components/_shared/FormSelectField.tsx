import { ChevronDown } from 'lucide-react'

const selectCls =
  'w-full h-12 bg-white dark:bg-bg-dark border border-slate-300 dark:border-border-dark px-3.5 font-nunito text-[15px] text-text-light dark:text-text-dark focus:outline-none focus:border-primary-light dark:focus:border-primary-dark focus:ring-1 focus:ring-primary-light/20 dark:focus:ring-primary-dark/20 transition-colors rounded-none appearance-none cursor-pointer'

interface FormSelectFieldProps {
  id: string
  label?: string
  value: string
  onChange: (v: string) => void
  optional?: boolean
  hint?: string
  error?: string
  children: React.ReactNode
  className?: string
}

export function FormSelectField({
  id,
  label,
  value,
  onChange,
  optional,
  hint,
  error,
  children,
  className
}: FormSelectFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-f10 font-mono tracking-[0.18em] uppercase text-muted-light dark:text-muted-dark"
      >
        {label}
        {optional && <span className="ml-2 text-f9 normal-case tracking-normal opacity-60">optional</span>}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={className ?? selectCls}
          aria-invalid={!!error}
        >
          {children}
        </select>
        <ChevronDown
          size={16}
          className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-light dark:text-muted-dark"
          aria-hidden="true"
        />
      </div>
      {hint && <p className="text-[11.5px] font-nunito text-muted-light dark:text-muted-dark">{hint}</p>}
      {error && (
        <p role="alert" className="mt-1.5 text-[11.5px] font-nunito text-red-500 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  )
}
