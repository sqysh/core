import { AttendanceMember, AttendanceRow } from '@/app/lib/actions/attendance/getAttendanceHistory'
import { deleteMeeting } from '@/app/lib/actions/meeting/deleteMeeting'
import { useState, useTransition } from 'react'
import { motion } from 'framer-motion'
import { fmtThursday } from '@/app/lib/utils/date.utils'
import { MemberChip } from './MemberChip'
import { useRouter } from 'next/navigation'

export function MeetingRow({
  row,
  members,
  index
}: {
  row: AttendanceRow
  members: AttendanceMember[]
  index: number
}) {
  const [confirming, setConfirming] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleDelete() {
    startTransition(async () => {
      await deleteMeeting(row.id)
      setConfirming(false)
      router.refresh()
    })
  }

  const attendedCount = row.attendedIds.length
  const pct = Math.round((attendedCount / members.length) * 100)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
      className="py-4 flex flex-col sm:flex-row sm:items-start gap-4"
    >
      {/* Date + stats */}
      <div className="shrink-0 sm:w-48">
        <p className="font-sora font-bold text-[13px] text-text-light dark:text-text-dark leading-tight">
          {fmtThursday(row.date)}
        </p>
        <p className="text-f10 font-mono tracking-widest uppercase text-muted-light dark:text-muted-dark mt-1">
          {attendedCount} / {members.length} attended
        </p>
        <div className="mt-2 h-1 w-full bg-border-light dark:bg-border-dark">
          <div className="h-full bg-green-500" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-f10 font-mono text-muted-light dark:text-muted-dark mt-0.5">{pct}%</p>

        {/* Delete */}
        <div className="mt-3 flex items-center gap-2">
          {confirming ? (
            <>
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="text-f10 font-mono tracking-widest uppercase text-white bg-red-500 hover:bg-red-600 px-2 py-1 transition-colors disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              >
                {isPending ? 'Deleting…' : 'Confirm'}
              </button>
              <button
                onClick={() => setConfirming(false)}
                disabled={isPending}
                className="text-f10 font-mono tracking-widest uppercase text-muted-light dark:text-muted-dark hover:text-text-light dark:hover:text-text-dark transition-colors disabled:opacity-40"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              className="text-f10 font-mono tracking-widest uppercase text-muted-light dark:text-muted-dark hover:text-red-500 dark:hover:text-red-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Member chips */}
      <div className="flex flex-wrap gap-1.5 flex-1">
        {members.map((member) => (
          <MemberChip
            key={`${row.id}-${member.id}`}
            member={member}
            attended={row.attendedIds.includes(member.id)}
            checkedInTime={row.checkedInTimes[member.id]}
            meetingId={row.id}
          />
        ))}
      </div>
    </motion.div>
  )
}
