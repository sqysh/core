import { forwardRef } from 'react'

interface ToggleProps {
  name?: string
  checked: boolean
  onChange: (e: { target: { name: string; checked: boolean } }) => void
  label?: string
  description?: string
  disabled?: boolean
}

export const Toggle = forwardRef<HTMLInputElement, ToggleProps>(
  ({ name, checked, onChange, label, description, disabled = false }, ref) => {
    function toggle() {
      if (!disabled) onChange({ target: { name: name ?? '', checked: !checked } })
    }

    return (
      <div className="flex items-start gap-3">
        <input
          ref={ref}
          type="checkbox"
          name={name}
          checked={checked}
          onChange={onChange}
          className="sr-only"
          disabled={disabled}
        />

        <button
          type="button"
          role="switch"
          aria-checked={checked}
          onClick={toggle}
          disabled={disabled}
          className={`relative w-11 h-6 transition-colors duration-200 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark focus-visible:ring-offset-2 ${
            disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
          } ${checked ? 'bg-primary-light dark:bg-primary-dark' : 'bg-slate-300 dark:bg-border-dark'}`}
        >
          <span className="sr-only">{label}</span>
          <span
            className={`absolute top-1 w-4 h-4 bg-white transition-transform duration-200 ${
              checked ? 'translate-x-0.5' : '-translate-x-4.5'
            }`}
          />
        </button>

        {(label || description) && (
          <div className="flex-1">
            {label && (
              <p
                onClick={toggle}
                className={`text-[13px] font-nunito font-medium text-text-light dark:text-text-dark ${
                  disabled ? 'opacity-40' : 'cursor-pointer'
                }`}
              >
                {label}
              </p>
            )}
            {description && (
              <p className="text-[11.5px] font-nunito text-muted-light dark:text-muted-dark mt-0.5">{description}</p>
            )}
          </div>
        )}
      </div>
    )
  }
)

Toggle.displayName = 'Toggle'
