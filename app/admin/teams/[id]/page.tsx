import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getCurrentProfile, createServerClient } from '@/lib/supabase-server'
import AppLayout from '@/components/AppLayout'
import TeamDetailClient from './TeamDetailClient'
import type { Profile, Team, TeamMember } from '@/lib/types'

interface MemberWithProfile extends TeamMember {
  profiles: Pick<Profile, 'id' | 'full_name' | 'email' | 'belt_rank' | 'avatar_url'>
}

export default async function TeamDetailPage({ params }: { params: { id: string } }) {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')
  if (profile.role !== 'admin' && profile.role !== 'trainer') redirect('/dashboard')

  const supabase = createServerClient()

  const [teamRes, membersRes] = await Promise.all([
    supabase.from('teams').select('*').eq('id', params.id).single(),
    supabase
      .from('team_members')
      .select('id, team_id, profile_id, role, joined_at, profiles(id, full_name, email, belt_rank, avatar_url)')
      .eq('team_id', params.id)
      .order('role')
      .order('joined_at'),
  ])

  if (!teamRes.data) notFound()

  const team = teamRes.data as Team

  // Supabase returns joined relations as arrays — normalize profiles to a single object
  const members: MemberWithProfile[] = (membersRes.data ?? []).map((m) => ({
    id: m.id,
    team_id: m.team_id,
    profile_id: m.profile_id,
    role: m.role,
    joined_at: m.joined_at,
    profiles: Array.isArray(m.profiles) ? m.profiles[0] : m.profiles,
  }))

  const athletes = members.filter((m) => m.role === 'athlete')
  const trainers = members.filter((m) => m.role === 'trainer')

  const isAdmin = profile.role === 'admin'

  return (
    <AppLayout profile={profile}>
      <div className="p-6 max-w-2xl mx-auto">
        <div className="mb-4">
          <Link href="/admin/teams" className="text-sm text-gray-500 hover:text-gray-700">
            ← Back to teams
          </Link>
        </div>

        <TeamDetailClient
          team={team}
          athletes={athletes}
          trainers={trainers}
          isAdmin={isAdmin}
        />
      </div>
    </AppLayout>
  )
}
