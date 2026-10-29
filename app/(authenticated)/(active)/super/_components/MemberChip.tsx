import { toggleAttendance } from '@/lib/actions/attendance/toggleAttendance'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

export function MemberChip({
  member,
  attended: initialAttended,
  checkedInTime,
  meetingId,
  reinstated,
  notYetMember = false
}: {
  member: { id: string; name: string; startedAt: string }
  attended: boolean
  checkedInTime?: string
  meetingId: string
  reinstated: boolean
  notYetMember?: boolean
}) {
  const [attended, setAttended] = useState(initialAttended)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const firstName = member.name.split(' ')[0]
  const lastName = member.name.split(' ').slice(1).join(' ')
  const preMember = notYetMember && !attended

  const joinedLabel = new Date(`${member.startedAt}T12:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  })

  function handleToggle() {
    const next = !attended
    setAttended(next)
    startTransition(async () => {
      await toggleAttendance({
        meetingId,
        userId: member.id,
        currentlyAttended: attended
      })
      router.refresh()
    })
  }

  if (preMember) {
    return (
      <div
        title={`Joined ${joinedLabel}`}
        className="flex flex-col items-center justify-center px-2 py-1.5 border border-dashed border-border-light/50 dark:border-border-dark/50 bg-[repeating-linear-gradient(135deg,transparent,transparent_4px,rgba(120,120,120,0.06)_4px,rgba(120,120,120,0.06)_8px)]"
      >
        <p className="text-[11px] font-mono font-normal leading-tight text-muted-light/35 dark:text-muted-dark/35">
          {firstName}
        </p>
        <p className="text-[9px] font-mono leading-tight text-muted-light/35 dark:text-muted-dark/35">{lastName}</p>
        <p className="text-[8px] font-mono tracking-wider uppercase leading-tight mt-0.5 text-muted-light/50 dark:text-muted-dark/50">
          joins {joinedLabel}
        </p>
      </div>
    )
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
