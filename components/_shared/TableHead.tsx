interface TableHeadProps {
  /** The grid template the rows below use, so the columns line up */
  cols: string
  heads: readonly string[]
}

export function TableHead({ cols, heads }: TableHeadProps) {
  return (
    <div className={`${cols} py-2.5 bg-bg-light dark:bg-bg-dark border-b border-border-light dark:border-border-dark`}>
      {heads.map((h) => (
        <span key={h} className="text-[9.5px] font-mono tracking-[0.15em] uppercase text-on-dark">
          {h}
        </span>
      ))}
    </div>
  )
}
