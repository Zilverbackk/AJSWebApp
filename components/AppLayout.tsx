import Navigation from './Navigation'
import type { Profile } from '@/lib/types'

interface AppLayoutProps {
  profile: Profile
  children: React.ReactNode
}

export default function AppLayout({ profile, children }: AppLayoutProps) {
  return (
    <div className="flex flex-col lg:flex-row min-h-screen">
      <Navigation role={profile.role} userName={profile.full_name} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
