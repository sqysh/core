import { User } from '@/types/user.types'
import React from 'react'
import Picture from '../common/Picture'
import { useUserSelector } from '@/app/lib/redux/store'
import Link from 'next/link'

const CustomerAvatars = () => {
  // TODO
  const users = []
  const totalCount = users?.length
  // Show first 4-5 users for the avatars
  const displayUsers = users?.slice(-15) || []

  return (
    <div className="flex items-center gap-4 bg-gray-900 text-white px-6 py-3 rounded-lg pb-10">
      {/* Overlapping Avatar Stack */}
      <div className="flex -space-x-3">
        {displayUsers.map(
          (user: User, index: number) =>
            user?.profileImage && (
              <Link
                href={`/navigators/${user.id}/profile`}
                key={user.id || index}
                className="relative cursor-pointer"
                style={{ zIndex: displayUsers.length - index }}
              >
                <Picture
                  src={user.profileImage || '/images/sqysh.png'}
                  alt={user.name || `User ${index + 1}`}
                  className="w-12 h-12 rounded-full border-2 border-white object-cover bg-gray-950"
                  priority={false}
                />
              </Link>
            )
        )}
      </div>

      {/* Customer Count Text */}
      <div className="text-gray-300 text-sm font-medium">Join {totalCount?.toLocaleString()}+ Other Professionals</div>
    </div>
  )
}

export default CustomerAvatars
