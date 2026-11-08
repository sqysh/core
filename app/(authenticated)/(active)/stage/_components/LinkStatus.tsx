import { Tv } from 'lucide-react'

export function LinkStatus({ ok }: { ok: boolean }) {
  return (
    <div
      className={`inline-flex h-9 items-center gap-2 border px-3 font-mono text-[12px] ${
        ok
          ? 'border-border-light text-muted-light dark:border-border-dark dark:text-muted-dark'
          : 'border-red-500 text-red-600 dark:text-red-400'
      }`}
    >
      <Tv size={14} aria-hidden="true" />
      {ok ? 'TV linked' : 'TV not reached'}
    </div>
  )
}
