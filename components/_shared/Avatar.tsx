import { getInitials } from '@/lib/utils/shared.utils'

const SIZES = {
  xs: 'w-7 h-7 text-[9px]',
  sm: 'w-9 h-9 text-[11px]',
  md: 'w-11 h-11 text-[13px]',
  lg: 'w-16 h-16 text-[18px]'
} as const

interface AvatarProps {
  member: { name: string; profileImage?: string | null }
  size?: keyof typeof SIZES
  /** Leave empty when the name is printed beside the avatar */
  alt?: string
}

export function Avatar({ member, size = 'sm', alt = '' }: AvatarProps) {
  return (
    <div
      className={`${SIZES[size]} shrink-0 rounded-full overflow-hidden border border-primary-light/20 dark:border-primary-dark/20 bg-primary-light/10 dark:bg-primary-dark/10 flex items-center justify-center`}
    >
      {member.profileImage ? (
        <img src={member.profileImage} alt={alt} className="w-full h-full object-cover" />
      ) : (
        <span className="font-sora font-black text-primary-light dark:text-primary-dark">
          {getInitials(member.name)}
        </span>
      )}
    </div>
  )
}
