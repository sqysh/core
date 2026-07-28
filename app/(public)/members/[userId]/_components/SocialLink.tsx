export function SocialLink({ href, icon: Icon, label }: { href: string; icon: React.ElementType; label: string }) {
  if (!href) return null
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="w-9 h-9 flex items-center justify-center border border-border-light dark:border-border-dark text-muted-light dark:text-muted-dark hover:text-primary-light dark:hover:text-primary-dark hover:border-primary-light dark:hover:border-primary-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark"
    >
      <Icon size={14} />
    </a>
  )
}
