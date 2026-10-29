export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 mb-4 border-l-2 border-primary-light dark:border-primary-dark pl-3">
      <h2 className="text-f10 font-mono tracking-[0.12em] uppercase text-primary-light dark:text-primary-dark">
        {children}
      </h2>
    </div>
  )
}
