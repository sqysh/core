export function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <span className="block w-5 h-px bg-primary-light dark:bg-primary-dark shrink-0" aria-hidden="true" />
      <p className="text-f10 font-mono tracking-[0.2em] uppercase text-primary-light dark:text-primary-dark">{label}</p>
    </div>
  )
}
