export function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-3 pb-4 mb-5 border-b border-border-light dark:border-border-dark">
      <div className="w-8 h-8 flex items-center justify-center bg-primary-light/10 dark:bg-primary-dark/10 border border-primary-light/20 dark:border-primary-dark/20 shrink-0">
        <Icon size={14} className="text-primary-light dark:text-primary-dark" aria-hidden="true" />
      </div>
      <h2 className="font-sora font-black text-[15px] text-text-light dark:text-text-dark tracking-tight">{title}</h2>
    </div>
  )
}
