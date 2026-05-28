import { redirect } from 'next/navigation'
import { getCurrentProfile, createServerClient } from '@/lib/supabase-server'
import AppLayout from '@/components/AppLayout'
import CheckinLiveView from './CheckinLiveView'
import type { Session } from '@/lib/types'

export default async function AdminCheckinPage() {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')
  if (profile.role !== 'admin') redirect('/dashboard')

  const supabase = createServerClient()
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)

  const [sessionsRes, checkinsRes] = await Promise.all([
    supabase
      .from('sessions')
      .select('id, title, starts_at, ends_at, session_type')
      .gte('starts_at', todayStart.toISOString())
      .lte('starts_at', todayEnd.toISOString())
      .order('starts_at'),
    supabase
      .from('check_ins')
      .select('id, athlete_id, session_id, checked_in_at, profiles(full_name, belt_rank, avatar_url)')
      .gte('checked_in_at', todayStart.toISOString())
      .order('checked_in_at', { ascending: false }),
  ])

  return (
    <AppLayout profile={profile}>
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Live Check-in</h1>
        <CheckinLiveView
          initialCheckins={(checkinsRes.data ?? []).map((r) => ({
            ...r,
            profiles: Array.isArray(r.profiles) ? r.profiles[0] ?? null : r.profiles,
          }))}
          todaySessions={(sessionsRes.data ?? []) as Session[]}
        />
      </div>
    </AppLayout>
  )
}
