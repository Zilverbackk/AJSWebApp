import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentProfile, createServerClient } from '@/lib/supabase-server'
import AppLayout from '@/components/AppLayout'
import CreateTeamButton from './CreateTeamButton'
import type { Team } from '@/lib/types'

interface TeamWithCounts extends Team {
  athlete_count: number
  trainer_count: number
}

export default async function TeamsPage() {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')
  if (profile.role !== 'admin' && profile.role !== 'trainer') redirect('/dashboard')

  const supabase = createServerClient()

  const { data: teams } = await supabase
    .from('teams')
    .select('*')
    .order('name')

  // Get member counts per team
  const { data: memberCounts } = await supabase
    .from('team_members')
    .select('team_id, role')

  const countsByTeam: Record<string, { athlete_count: number; trainer_count: number }> = {}
  for (const m of memberCounts ?? []) {
    if (!countsByTeam[m.team_id]) countsByTeam[m.team_id] = { athlete_count: 0, trainer_count: 0 }
    if (m.role === 'athlete') countsByTeam[m.team_id].athlete_count++
    if (m.role === 'trainer') countsByTeam[m.team_id].trainer_count++
  }

  const teamsWithCounts: TeamWithCounts[] = (teams ?? []).map((t: Team) => ({
    ...t,
    ...(countsByTeam[t.id] ?? { athlete_count: 0, trainer_count: 0 }),
  }))

  const isAdmin = profile.role === 'admin'

  return (
    <AppLayout profile={profile}>
      <div className="p-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Teams</h1>
          {isAdmin && <CreateTeamButton />}
        </div>

        {teamsWithCounts.length === 0 ? (
          <div className="card p-10 text-center text-gray-500">
            <p className="text-4xl mb-3">🏆</p>
            <p className="font-medium">No teams yet.</p>
            {isAdmin && (
              <p className="text-sm mt-1">Create your first team to start organising training sessions.</p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {teamsWithCounts.map((team) => (
              <div key={team.id} className="card p-5 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900">{team.name}</p>
                  {team.description && (
                    <p className="text-sm text-gray-500 mt-0.5 truncate">{team.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                    <span>{team.athlete_count} athlete{team.athlete_count !== 1 ? 's' : ''}</span>
                    <span>·</span>
                    <span>{team.trainer_count} trainer{team.trainer_count !== 1 ? 's' : ''}</span>
                  </div>
                </div>
                <Link
                  href={`/admin/teams/${team.id}`}
                  className="btn-secondary text-sm flex-shrink-0"
                >
                  {isAdmin ? 'Manage' : 'View'}
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
