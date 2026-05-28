import Image from 'next/image'
import type { Profile } from '@/lib/types'
import { getBeltColor } from '@/lib/belt-colors'

interface MemberCardProps {
  profile: Pick<Profile, 'full_name' | 'email' | 'belt_rank' | 'joined_at' | 'avatar_url' | 'active'>
  checkinCount?: number
}

export default function MemberCard({ profile, checkinCount }: MemberCardProps) {
  const initials = profile.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="flex items-center gap-4 p-4">
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        {profile.avatar_url ? (
          <Image
            src={profile.avatar_url}
            alt={profile.full_name}
            width={64}
            height={64}
            className="rounded-full object-cover"
          />
        ) : (
          <div className="h-16 w-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-xl font-semibold">
            {initials}
          </div>
        )}
        {/* Active indicator */}
        <span
          className={`absolute bottom-0 right-0 block h-3 w-3 rounded-full ring-2 ring-white ${
            profile.active ? 'bg-green-400' : 'bg-gray-400'
          }`}
        />
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-lg font-semibold text-gray-900 truncate">
            {profile.full_name}
          </h2>
          {profile.belt_rank && (
            <span className={`belt-badge ${getBeltColor(profile.belt_rank)}`}>
              {profile.belt_rank}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 truncate">{profile.email}</p>
        <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
          {profile.joined_at && (
            <span>
              Joined{' '}
              {new Date(profile.joined_at).toLocaleDateString('en-GB', {
                month: 'short',
                year: 'numeric',
              })}
            </span>
          )}
          {checkinCount !== undefined && (
            <span>{checkinCount} check-ins</span>
          )}
        </div>
      </div>
    </div>
  )
}
