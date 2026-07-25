interface FormFieldProps {
  id: string
  label: string
  required?: boolean
  optional?: boolean
  hint?: string
  error?: string
  children?: React.ReactNode
  // input props — only used when no children
  type?: string
  name?: string
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  autoComplete?: string
  list?: string
  className?: string
}

const inputCls =
  'w-full h-12 bg-white dark:bg-bg-dark border border-slate-300 dark:border-border-dark px-3.5 font-nunito text-[15px] text-text-light dark:text-text-dark placeholder:text-slate-400 dark:placeholder:text-muted-dark/50 focus:outline-none focus:border-primary-light dark:focus:border-primary-dark focus:ring-1 focus:ring-primary-light/20 dark:focus:ring-primary-dark/20 transition-colors rounded-none'

export function ErrorText({ error }: { error: string }) {
  return (
    <p role="alert" className="mt-1.5 text-[11.5px] font-nunito text-red-500 dark:text-red-400">
      {error}
    </p>
  )
}

export function FormField({
  id,
  label,
  required,
  optional,
  hint,
  error,
  children,
  type = 'text',
  name,
  value,
  onChange,
  placeholder,
  autoComplete,
  list,
  className
}: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-f10 font-mono tracking-[0.18em] uppercase text-muted-light dark:text-muted-dark"
      >
        {label}
        {required && (
          <span className="ml-1 text-primary-light dark:text-primary-dark" aria-hidden="true">
            *
          </span>
        )}
        {optional && <span className="ml-2 text-f9 normal-case tracking-normal opacity-60">optional</span>}
      </label>

      {children ?? (
        <input
          id={id}
          type={type}
          name={name ?? id}
          value={value ?? ''}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          list={list}
          aria-required={required}
          aria-invalid={!!error}
          className={className ?? inputCls}
        />
      )}

      {hint && <p className="text-[11.5px] font-nunito text-muted-light dark:text-muted-dark">{hint}</p>}
      {error && <ErrorText error={error} />}
    </div>
  )
}
