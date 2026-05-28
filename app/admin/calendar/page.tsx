import { redirect } from 'next/navigation'
import { getCurrentProfile, createServerClient } from '@/lib/supabase-server'
import AppLayout from '@/components/AppLayout'
import CalendarClient from './CalendarClient'
import type { Session } from '@/lib/types'

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: { year?: string; month?: string }
}) {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')
  if (profile.role !== 'admin' && profile.role !== 'trainer') redirect('/dashboard')

  const now = new Date()
  const year = parseInt(searchParams.year ?? String(now.getFullYear()))
  const month = parseInt(searchParams.month ?? String(now.getMonth() + 1))

  // Fetch sessions for the whole month (+ a few days buffer)
  const start = new Date(year, month - 1, 1).toISOString()
  const end = new Date(year, month, 1).toISOString()

  const supabase = createServerClient()
  const { data: sessions } = await supabase
    .from('sessions')
    .select('*')
    .gte('starts_at', start)
    .lt('starts_at', end)
    .order('starts_at')

  return (
    <AppLayout profile={profile}>
      <div className="p-6">
        <CalendarClient
          sessions={(sessions ?? []) as Session[]}
          year={year}
          month={month}
          canEdit={profile.role === 'admin' || profile.role === 'trainer'}
        />
      </div>
    </AppLayout>
  )
}
