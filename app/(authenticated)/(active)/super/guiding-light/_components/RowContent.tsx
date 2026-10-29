import { GuidingLightRecord } from '../SuperGuidingLightClient'
import { fmtDate } from '@/lib/utils/date.utils'
import { getInitials } from '@/lib/utils/shared.utils'
import { Member } from '../../../guiding-light/_types/guiding-light.types'

function Avatar({ member }: { member: Member }) {
  return (
    <div className="w-7 h-7 shrink-0 rounded-full overflow-hidden border border-primary-light/20 dark:border-primary-dark/20 bg-primary-light/10 dark:bg-primary-dark/10 flex items-center justify-center">
      {member.profileImage ? (
        <img src={member.profileImage} alt={member.name} className="w-full h-full object-cover" />
      ) : (
        <span className="font-sora font-black text-[9px] text-primary-light dark:text-primary-dark">
          {getInitials(member.name)}
        </span>
      )}
    </div>
  )
}

export function RowContent({
  r,
  isLatest,
  onChangeWinner
}: {
  r: GuidingLightRecord
  isLatest?: boolean
  onChangeWinner?: () => void
}) {
  return (
    <>
      {/* Date */}
      <p className="text-[12px] font-mono text-muted-light dark:text-muted-dark">{fmtDate(r.meetingDate)}</p>

      {/* Winner */}
      {r.winner ? (
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar member={r.winner} />
          <div className="min-w-0">
            <p className="font-sora font-bold text-[13px] text-text-light dark:text-text-dark truncate">
              {r.winner.name}
            </p>
            <p className="text-[10px] font-mono text-muted-light dark:text-muted-dark truncate">{r.winner.company}</p>
          </div>
          {isLatest && onChangeWinner && (
            <button
              onClick={(e) => {
                e.preventDefault()
                onChangeWinner()
              }}
              className="ml-2 shrink-0 h-6 px-2 border border-border-light dark:border-border-dark text-muted-light dark:text-muted-dark font-mono text-[8px] tracking-[0.12em] uppercase hover:border-primary-light dark:hover:border-primary-dark hover:text-primary-light dark:hover:text-primary-dark transition-colors"
            >
              Change
            </button>
          )}
        </div>
      ) : (
        <span className="text-[12px] font-mono text-muted-light dark:text-muted-dark">—</span>
      )}

      {/* Judged by */}
      {r.judgedBy ? (
        <div className="min-w-0">
          <p className="font-sora font-bold text-[13px] text-text-light dark:text-text-dark truncate">
            {r.judgedBy.name}
          </p>
          <p className="text-[10px] font-mono text-muted-light dark:text-muted-dark truncate">{r.judgedBy.company}</p>
        </div>
      ) : (
        <span className="text-[12px] font-mono text-muted-light dark:text-muted-dark">—</span>
      )}

      {/* Status */}
      <span
        className={`text-[9px] font-mono tracking-widest uppercase px-1.5 py-0.5 border w-fit ${
          r.status === 'REVEALED'
            ? 'bg-emerald-50 dark:bg-emerald-400/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-400/20'
            : 'bg-amber-50 dark:bg-amber-400/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-400/20'
        }`}
      >
        {r.status.toLowerCase()}
      </span>
    </>
  )
}
