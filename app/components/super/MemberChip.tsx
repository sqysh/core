import { toggleAttendance } from '@/app/lib/actions/attendance/toggleAttendance'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

export function MemberChip({
  member,
  attended: initialAttended,
  checkedInTime,
  meetingId,
  reinstated
}: {
  member: { id: string; name: string }
  attended: boolean
  checkedInTime?: string
  meetingId: string
  reinstated: boolean
}) {
  const [attended, setAttended] = useState(initialAttended)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const firstName = member.name.split(' ')[0]
  const lastName = member.name.split(' ').slice(1).join(' ')

  function handleToggle() {
    const next = !attended
    setAttended(next)
    startTransition(async () => {
      await toggleAttendance({
        meetingId,
        userId: member.id,
        attended
      })
      router.refresh()
    })
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className={`relative flex flex-col items-center px-2 py-1.5 border transition-all duration-200 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark ${
        attended
          ? 'border-green-500/40 bg-green-500/10 hover:bg-green-500/5'
          : 'border-border-light dark:border-border-dark opacity-40 hover:opacity-60'
      }`}
    >
      {/* Reinstated amber dot */}
      {reinstated && (
        <span
          className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-500"
          title="Reinstated"
          aria-label="Attendance reinstated"
        />
      )}

      <p
        className={`text-[11px] font-sora font-bold leading-tight ${
          attended ? 'text-green-600 dark:text-green-400' : 'text-text-light dark:text-text-dark'
        }`}
      >
        {firstName}
      </p>
      <p
        className={`text-[10px] font-mono leading-tight ${
          attended ? 'text-green-500/70' : 'text-muted-light dark:text-muted-dark'
        }`}
      >
        {lastName}
      </p>
      {attended && checkedInTime && (
        <p className="text-[9px] font-mono text-green-500/60 leading-tight mt-0.5">{checkedInTime}</p>
      )}
    </button>
  )
}
