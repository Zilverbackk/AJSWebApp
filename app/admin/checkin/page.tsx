import { redirect } from 'next/navigation'
import { getCurrentProfile, createServerClient } from '@/lib/supabase-server'
import AppLayout from '@/components/AppLayout'
import CheckinLiveView from './CheckinLiveView'
import type { Session } from '@/lib/types'

export default async function AdminCheckinPage() {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')
  if (profile.role !== 'admin' && profile.role !== 'trainer') redirect('/dashboard')

  const supabase = createServerClient()
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)

  // For trainers: get their team IDs so we can filter sessions
  let trainerTeamIds: string[] = []
  if (profile.role === 'trainer') {
    const { data: teamRows } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('profile_id', profile.id)
      .eq('role', 'trainer')
    trainerTeamIds = (teamRows ?? []).map((r: { team_id: string }) => r.team_id)
  }

  // Fetch today's sessions
  let sessionsQuery = supabase
    .from('sessions')
    .select('id, title, starts_at, ends_at, session_type, team_id')
    .gte('starts_at', todayStart.toISOString())
    .lte('starts_at', todayEnd.toISOString())
    .order('starts_at')

  // Trainers: filter to their teams + untagged sessions
  // Admin: all sessions
  // We do the filtering after fetch since Supabase doesn't support OR with IS NULL easily in all SDK versions
  const { data: allSessions } = await sessionsQuery

  const todaySessions = profile.role === 'admin'
    ? (allSessions ?? [])
    : (allSessions ?? []).filter(
        (s: { team_id: string | null }) => !s.team_id || trainerTeamIds.includes(s.team_id)
      )

  const todaySessionIds = todaySessions.map((s: { id: string }) => s.id)

  // Fetch check-ins for today — filter to relevant sessions if trainer
  let checkinsQuery = supabase
    .from('check_ins')
    .select('id, athlete_id, session_id, checked_in_at, profiles(full_name, belt_rank, avatar_url)')
    .gte('checked_in_at', todayStart.toISOString())
    .order('checked_in_at', { ascending: false })

  if (profile.role === 'trainer' && todaySessionIds.length > 0) {
    checkinsQuery = checkinsQuery.in('session_id', todaySessionIds)
  } else if (profile.role === 'trainer' && todaySessionIds.length === 0) {
    // No sessions for this trainer today — return empty
    return (
      <AppLayout profile={profile}>
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Live Check-in</h1>
          <CheckinLiveView
            initialCheckins={[]}
            todaySessions={[]}
            trainerTeamIds={trainerTeamIds}
            isAdmin={false}
          />
        </div>
      </AppLayout>
    )
  }

  const { data: checkinsData } = await checkinsQuery

  return (
    <AppLayout profile={profile}>
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Live Check-in</h1>
        <CheckinLiveView
          initialCheckins={(checkinsData ?? []).map((r) => ({
            ...r,
            profiles: Array.isArray(r.profiles) ? r.profiles[0] ?? null : r.profiles,
          }))}
          todaySessions={(todaySessions ?? []) as Session[]}
          trainerTeamIds={trainerTeamIds}
          isAdmin={profile.role === 'admin'}
        />
      </div>
    </AppLayout>
  )
}
