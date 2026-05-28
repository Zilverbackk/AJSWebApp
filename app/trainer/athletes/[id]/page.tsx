import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getCurrentProfile, createServerClient } from '@/lib/supabase-server'
import AppLayout from '@/components/AppLayout'
import MemberCard from '@/components/MemberCard'
import CheckinHeatmap from './CheckinHeatmap'
import type { Profile, Program, CheckIn } from '@/lib/types'

export default async function AthleteProfilePage({ params }: { params: { id: string } }) {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')
  if (profile.role !== 'admin' && profile.role !== 'trainer') redirect('/dashboard')

  const supabase = createServerClient()

  // 30 days ago
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [athleteRes, checkinsRes, programsRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', params.id).single(),
    supabase
      .from('check_ins')
      .select('id, checked_in_at, session_id')
      .eq('athlete_id', params.id)
      .gte('checked_in_at', thirtyDaysAgo.toISOString())
      .order('checked_in_at'),
    supabase
      .from('programs')
      .select('id, title, status, created_at, exercises')
      .eq('athlete_id', params.id)
      .order('created_at', { ascending: false }),
  ])

  if (!athleteRes.data) notFound()

  const athlete = athleteRes.data as Profile
  const checkins = (checkinsRes.data ?? []) as Pick<CheckIn, 'id' | 'checked_in_at' | 'session_id'>[]
  const programs = (programsRes.data ?? []) as Pick<Program, 'id' | 'title' | 'status' | 'created_at' | 'exercises'>[]

  // Check-in streak
  const streak = computeStreak(checkins.map((c) => c.checked_in_at))

  return (
    <AppLayout profile={profile}>
      <div className="p-6 max-w-3xl mx-auto">
        <div className="mb-4">
          <Link href="/trainer/athletes" className="text-sm text-gray-500 hover:text-gray-700">
            ← Back to athletes
          </Link>
        </div>

        {/* Profile header */}
        <div className="card mb-6">
          <MemberCard profile={athlete} checkinCount={checkins.length} />
          {streak > 0 && (
            <div className="px-4 pb-4">
              <span className="text-sm text-amber-600 font-medium">
                🔥 {streak} session streak (last 30 days)
              </span>
            </div>
          )}
        </div>

        {/* Check-in heatmap */}
        <div className="card p-5 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Check-ins — last 30 days</h2>
          <CheckinHeatmap checkinDates={checkins.map((c) => c.checked_in_at)} />
          <p className="text-sm text-gray-500 mt-3">
            {checkins.length} check-in{checkins.length !== 1 ? 's' : ''} in the last 30 days
          </p>
        </div>

        {/* Programs */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Strength Programs</h2>
            <Link
              href={`/trainer/athletes/${params.id}/program/new`}
              className="btn-primary text-sm"
            >
              + Assign program
            </Link>
          </div>

          {programs.length === 0 ? (
            <p className="text-sm text-gray-500">No programs assigned yet.</p>
          ) : (
            <ul className="space-y-3">
              {programs.map((p) => (
                <li key={p.id} className="rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{p.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {Array.isArray(p.exercises) ? p.exercises.length : 0} exercise{Array.isArray(p.exercises) && p.exercises.length !== 1 ? 's' : ''} ·{' '}
                        {new Date(p.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <span
                      className={`belt-badge ${
                        p.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'
                      } capitalize`}
                    >
                      {p.status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppLayout>
  )
}

function computeStreak(checkinDates: string[]): number {
  if (checkinDates.length === 0) return 0

  // Get unique days with check-ins
  const days = new Set(checkinDates.map((d) => d.split('T')[0]))
  let streak = 0
  const today = new Date()

  for (let i = 0; i < 30; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().split('T')[0]
    if (days.has(key)) {
      streak++
    } else if (i > 0) {
      break
    }
  }

  return streak
}
