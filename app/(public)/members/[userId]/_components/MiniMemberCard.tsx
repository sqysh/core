import { getInitials } from '@/lib/utils/shared.utils'
import { User } from '@/types/user.types'
import { ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function MiniMemberCard({ member }: { member: User }) {
  const router = useRouter()
  return (
    <button
      onClick={() => router.push(`/members/${member.id}`)}
      className="group flex items-center gap-3 p-3 border border-border-light dark:border-border-dark hover:border-primary-light dark:hover:border-primary-dark bg-bg-light dark:bg-bg-dark hover:bg-surface-light dark:hover:bg-surface-dark transition-colors w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark"
      aria-label={`View ${member.name}'s profile`}
    >
      <div className="w-9 h-9 shrink-0 border border-border-light dark:border-border-dark overflow-hidden bg-primary-light/5 dark:bg-primary-dark/5 flex items-center justify-center">
        {member.profileImage ? (
          <img src={member.profileImage} alt={member.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-f9 font-mono font-bold text-primary-light dark:text-primary-dark">
            {getInitials(member.name)}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12.5px] font-sora font-bold text-text-light dark:text-text-dark truncate group-hover:text-primary-light dark:group-hover:text-primary-dark transition-colors">
          {member.name}
        </p>
        <p className="text-f10 font-nunito text-muted-light dark:text-muted-dark truncate">{member.company}</p>
      </div>
      <ChevronRight
        size={12}
        className="text-muted-light dark:text-muted-dark group-hover:text-primary-light dark:group-hover:text-primary-dark group-hover:translate-x-0.5 transition-all shrink-0"
        aria-hidden="true"
      />
    </button>
  )
}
