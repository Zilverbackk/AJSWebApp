import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentProfile, createServerClient } from '@/lib/supabase-server'
import AppLayout from '@/components/AppLayout'

export default async function DashboardPage() {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')

  const supabase = createServerClient()

  // --- Admin dashboard data ---
  let memberCount = 0
  let todaySessions: { id: string; title: string; starts_at: string; session_type: string }[] = []
  let todayCheckinCount = 0

  // --- Trainer dashboard data ---
  let athleteCount = 0
  let activeProgramCount = 0

  // --- Athlete dashboard data ---
  let myCheckinCount = 0
  let nextSession: { id: string; title: string; starts_at: string; location: string | null } | null = null
  let myActivePrograms: { id: string; title: string }[] = []

  const today = new Date()
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString()
  const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString()

  if (profile.role === 'admin') {
    const [membersRes, sessionsRes, checkinsRes] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('active', true),
      supabase
        .from('sessions')
        .select('id, title, starts_at, session_type')
        .gte('starts_at', todayStart)
        .lt('starts_at', todayEnd)
        .order('starts_at'),
      supabase
        .from('check_ins')
        .select('id', { count: 'exact', head: true })
        .gte('checked_in_at', todayStart),
    ])
    memberCount = membersRes.count ?? 0
    todaySessions = sessionsRes.data ?? []
    todayCheckinCount = checkinsRes.count ?? 0
  }

  if (profile.role === 'trainer' || profile.role === 'admin') {
    const [athletesRes, programsRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'athlete')
        .eq('active', true),
      supabase
        .from('programs')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active'),
    ])
    athleteCount = athletesRes.count ?? 0
    activeProgramCount = programsRes.count ?? 0
  }

  if (profile.role === 'athlete') {
    const [checkinsRes, nextSessionRes, programsRes] = await Promise.all([
      supabase
        .from('check_ins')
        .select('id', { count: 'exact', head: true })
        .eq('athlete_id', profile.id),
      supabase
        .from('sessions')
        .select('id, title, starts_at, location')
        .gte('starts_at', new Date().toISOString())
        .order('starts_at')
        .limit(1),
      supabase
        .from('programs')
        .select('id, title')
        .eq('athlete_id', profile.id)
        .eq('status', 'active'),
    ])
    myCheckinCount = checkinsRes.count ?? 0
    nextSession = nextSessionRes.data?.[0] ?? null
    myActivePrograms = programsRes.data ?? []
  }

  const sessionTypeColors: Record<string, string> = {
    regular: 'bg-blue-100 text-blue-800',
    elite: 'bg-purple-100 text-purple-800',
    strength: 'bg-green-100 text-green-800',
    competition: 'bg-red-100 text-red-800',
  }

  return (
    <AppLayout profile={profile}>
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Welcome back, {profile.full_name.split(' ')[0]}
        </h1>

        {/* Admin Dashboard */}
        {profile.role === 'admin' && (
          <div className="space-y-6">
            {/* Stats row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard
                label="Active Members"
                value={memberCount}
                href="/admin/members"
                color="blue"
              />
              <StatCard
                label="Sessions Today"
                value={todaySessions.length}
                href="/admin/calendar"
                color="purple"
              />
              <StatCard
                label="Checked in Today"
                value={todayCheckinCount}
                href="/admin/checkin"
                color="green"
              />
            </div>

            {/* Today's sessions */}
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900">Today's Sessions</h2>
                <Link href="/admin/calendar" className="text-sm text-blue-600 hover:underline">
                  View calendar →
                </Link>
              </div>
              {todaySessions.length === 0 ? (
                <p className="text-sm text-gray-500">No sessions scheduled today.</p>
              ) : (
                <ul className="space-y-2">
                  {todaySessions.map((s) => (
                    <li key={s.id} className="flex items-center gap-3">
                      <span
                        className={`belt-badge ${sessionTypeColors[s.session_type] ?? 'bg-gray-100 text-gray-700'}`}
                      >
                        {s.session_type}
                      </span>
                      <span className="text-sm font-medium">{s.title}</span>
                      <span className="text-xs text-gray-400 ml-auto">
                        {new Date(s.starts_at).toLocaleTimeString('en-GB', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Quick links */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <QuickLink href="/admin/members/new" label="Add Member" icon="➕" />
              <QuickLink href="/admin/calendar" label="New Session" icon="📅" />
              <QuickLink href="/admin/checkin" label="Live Check-in" icon="✅" />
              <QuickLink href="/trainer/athletes" label="Athletes" icon="🥋" />
            </div>
          </div>
        )}

        {/* Trainer Dashboard */}
        {profile.role === 'trainer' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <StatCard
                label="Active Athletes"
                value={athleteCount}
                href="/trainer/athletes"
                color="blue"
              />
              <StatCard
                label="Active Programs"
                value={activeProgramCount}
                href="/trainer/athletes"
                color="green"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <QuickLink href="/trainer/athletes" label="View Athletes" icon="🥋" />
              <QuickLink href="/trainer/athletes" label="Assign Program" icon="💪" />
            </div>
          </div>
        )}

        {/* Athlete Dashboard */}
        {profile.role === 'athlete' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <StatCard
                label="Total Check-ins"
                value={myCheckinCount}
                href="/athlete/profile"
                color="blue"
              />
              <StatCard
                label="Active Programs"
                value={myActivePrograms.length}
                href="/athlete/programs"
                color="green"
              />
            </div>

            {/* Next session */}
            <div className="card p-5">
              <h2 className="font-semibold text-gray-900 mb-3">Next Session</h2>
              {nextSession ? (
                <div>
                  <p className="text-sm font-medium text-gray-900">{nextSession.title}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {new Date(nextSession.starts_at).toLocaleDateString('en-GB', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })}{' '}
                    at{' '}
                    {new Date(nextSession.starts_at).toLocaleTimeString('en-GB', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                  {nextSession.location && (
                    <p className="text-xs text-gray-400 mt-1">{nextSession.location}</p>
                  )}
                  <Link href="/athlete/checkin" className="btn-primary mt-4 inline-flex">
                    Go to check-in
                  </Link>
                </div>
              ) : (
                <p className="text-sm text-gray-500">No upcoming sessions scheduled.</p>
              )}
            </div>

            {/* Programs */}
            {myActivePrograms.length > 0 && (
              <div className="card p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-gray-900">Your Programs</h2>
                  <Link href="/athlete/programs" className="text-sm text-blue-600 hover:underline">
                    View all →
                  </Link>
                </div>
                <ul className="space-y-2">
                  {myActivePrograms.map((p) => (
                    <li key={p.id} className="text-sm text-gray-700">
                      💪 {p.title}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <QuickLink href="/athlete/checkin" label="Check in" icon="✅" />
              <QuickLink href="/athlete/programs" label="My Programs" icon="💪" />
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}

function StatCard({
  label,
  value,
  href,
  color,
}: {
  label: string
  value: number
  href: string
  color: 'blue' | 'green' | 'purple'
}) {
  const colors = {
    blue: 'bg-blue-50 text-blue-900',
    green: 'bg-green-50 text-green-900',
    purple: 'bg-purple-50 text-purple-900',
  }
  return (
    <Link href={href} className={`card p-5 hover:shadow-md transition-shadow ${colors[color]}`}>
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-sm font-medium mt-1 opacity-80">{label}</p>
    </Link>
  )
}

function QuickLink({ href, label, icon }: { href: string; label: string; icon: string }) {
  return (
    <Link
      href={href}
      className="card p-4 flex items-center gap-3 hover:shadow-md transition-shadow"
    >
      <span className="text-xl">{icon}</span>
      <span className="text-sm font-medium text-gray-700">{label}</span>
    </Link>
  )
}
