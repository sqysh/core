import Picture from '../../_shared/Picture'
import { ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { User } from '@/types/user.types'

export const PublicMemberCard = ({ member }: { member: User }) => {
  const { push } = useRouter()

  return (
    <button
      onClick={() => push(`/members/${member.id}`)}
      className="w-full text-left border border-border-light dark:border-border-dark hover:border-primary-light dark:hover:border-primary-dark bg-bg-light dark:bg-bg-dark hover:bg-surface-light dark:hover:bg-surface-dark transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark"
      aria-label={`View ${member.name}'s profile`}
    >
      {/* Image */}
      <div className="aspect-video w-full overflow-hidden bg-primary-light/5 dark:bg-primary-dark/5 relative">
        {member?.profileImage ? (
          <Picture
            priority
            src={member.profileImage}
            alt={member.name}
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-sora font-black text-[40px] text-primary-light/20 dark:text-primary-dark/20">
              {member.name
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase()}
            </span>
          </div>
        )}
        {member?.yearsInBusiness && (
          <div className="absolute bottom-3 left-3 bg-bg-light/90 dark:bg-bg-dark/90 px-2.5 py-1 border border-border-light dark:border-border-dark">
            <span className="text-f10 font-mono tracking-widest uppercase text-muted-light dark:text-muted-dark">
              {member.yearsInBusiness} yrs experience
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="px-4 py-4">
        <p className="font-sora font-black text-[16px] text-text-light dark:text-text-dark group-hover:text-primary-light dark:group-hover:text-primary-dark transition-colors leading-tight mb-0.5">
          {member.name}
        </p>
        <p className="text-[12.5px] font-nunito text-muted-light dark:text-muted-dark mb-3">
          {member.company}
          {member.industry ? ` · ${member.industry}` : ''}
        </p>

        <div className="flex items-center justify-between pt-3 border-t border-border-light dark:border-border-dark">
          <span className="text-f10 font-mono tracking-[0.15em] uppercase text-primary-light dark:text-primary-dark">
            View Profile
          </span>
          <ChevronRight
            size={14}
            className="text-primary-light dark:text-primary-dark group-hover:translate-x-1 transition-transform"
            aria-hidden="true"
          />
        </div>
      </div>
    </button>
  )
}
