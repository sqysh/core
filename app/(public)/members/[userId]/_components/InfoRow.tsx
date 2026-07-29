export function InfoRow({
  icon: Icon,
  value,
  title,
  href
}: {
  icon: React.ElementType
  value?: string
  title?: string
  href?: string
}) {
  if (!value) return null
  const content = (
    <div className="flex items-center gap-2.5">
      <Icon size={13} className="text-muted-light dark:text-muted-dark shrink-0" aria-hidden="true" />
      <span className="text-[13px] font-nunito text-text-light dark:text-text-dark">{title ?? value}</span>
    </div>
  )
  if (href)
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-primary-light dark:hover:text-primary-dark transition-colors"
      >
        {content}
      </a>
    )
  return <div>{content}</div>
}
