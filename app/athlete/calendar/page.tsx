import { redirect } from 'next/navigation'
import { getCurrentProfile, createServerClient } from '@/lib/supabase-server'
import AppLayout from '@/components/AppLayout'
import CalendarClient from '@/app/admin/calendar/CalendarClient'
import type { Session, Team } from '@/lib/types'

export default async function AthleteCalendarPage({
  searchParams,
}: {
  searchParams: { year?: string; month?: string }
}) {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')

  const now = new Date()
  const year = parseInt(searchParams.year ?? String(now.getFullYear()))
  const month = parseInt(searchParams.month ?? String(now.getMonth() + 1))

  const start = new Date(year, month - 1, 1).toISOString()
  const end = new Date(year, month, 1).toISOString()

  const supabase = createServerClient()

  // Get the athlete's team IDs
  const { data: teamRows } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('profile_id', profile.id)
    .eq('role', 'athlete')

  const myTeamIds = (teamRows ?? []).map((r: { team_id: string }) => r.team_id)

  // Fetch all sessions in the month, then filter to athlete's teams + untagged
  const [sessionsRes, teamsRes] = await Promise.all([
    supabase
      .from('sessions')
      .select('*')
      .gte('starts_at', start)
      .lt('starts_at', end)
      .order('starts_at'),
    supabase
      .from('teams')
      .select('id, name, description, created_by, created_at')
      .order('name'),
  ])

  const allSessions = (sessionsRes.data ?? []) as Session[]
  const sessions = allSessions.filter(
    (s) => !s.team_id || myTeamIds.includes(s.team_id)
  )

  return (
    <AppLayout profile={profile}>
      <div className="p-6">
        <CalendarClient
          sessions={sessions}
          teams={(teamsRes.data ?? []) as Team[]}
          year={year}
          month={month}
          canEdit={false}
          userRole={profile.role}
          userTeamIds={myTeamIds}
        />
      </div>
    </AppLayout>
  )
}
