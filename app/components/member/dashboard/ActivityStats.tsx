export function ActivityStats({ stats }) {
  return (
    <div className="grid grid-cols-3 border border-border-light dark:border-border-dark divide-x divide-border-light dark:divide-border-dark">
      {/* Meetings */}
      <div className="px-3 py-3 flex flex-col gap-1">
        <p className="text-f9 font-mono tracking-widest uppercase text-muted-light dark:text-muted-dark">Meetings</p>
        <p className="font-sora font-black text-[28px] xs:text-[32px] text-primary-light dark:text-primary-dark tabular-nums leading-none">
          {stats.parleyThisWeek}
        </p>
        <p className="text-f9 font-mono text-muted-light dark:text-muted-dark">this week</p>
        <p className="text-f9 font-mono text-text-light dark:text-text-dark font-bold mt-auto pt-2 border-t border-border-light dark:border-border-dark">
          {stats.totalParleys} total
        </p>
      </div>

      {/* Referrals */}
      <div className="px-3 py-3 flex flex-col gap-1">
        <p className="text-f9 font-mono tracking-widest uppercase text-muted-light dark:text-muted-dark">Referrals</p>
        <p className="font-sora font-black text-[28px] xs:text-[32px] text-primary-light dark:text-primary-dark tabular-nums leading-none">
          {stats.treasureMapsThisWeek}
        </p>
        <p className="text-f9 font-mono text-muted-light dark:text-muted-dark">this week</p>
        <p className="text-f9 font-mono text-text-light dark:text-text-dark font-bold mt-auto pt-2 border-t border-border-light dark:border-border-dark">
          {stats.totalTreasureMaps} total
        </p>
      </div>

      {/* Closed */}
      <div className="px-3 py-3 flex flex-col gap-1">
        <p className="text-f9 font-mono tracking-widest uppercase text-muted-light dark:text-muted-dark">Closed</p>
        <p className="font-sora font-black text-[28px] xs:text-[32px] text-primary-light dark:text-primary-dark tabular-nums leading-none">
          {stats.anchorsThisWeek}
        </p>
        <p className="text-f9 font-mono text-muted-light dark:text-muted-dark">{stats.closedAmountThisWeek}</p>
        <div className="flex items-center justify-between mt-auto pt-2 border-t border-border-light dark:border-border-dark">
          <p className="text-f9 font-mono text-muted-light dark:text-muted-dark">{stats.totalClosedAmount}</p>
          <p className="text-f9 font-mono text-text-light dark:text-text-dark font-bold">{stats.totalAnchors}</p>
        </div>
      </div>
    </div>
  )
}
