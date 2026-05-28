import { redirect } from 'next/navigation'
import { getCurrentProfile, createServerClient } from '@/lib/supabase-server'
import AppLayout from '@/components/AppLayout'
import CheckinButton from './CheckinButton'
import type { Session } from '@/lib/types'

export default async function AthleteCheckinPage() {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')

  const supabase = createServerClient()
  const now = new Date()

  // Find active session (started ≤30min ago or currently running, and not yet ended)
  const windowStart = new Date(now.getTime() - 30 * 60 * 1000).toISOString()

  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, title, starts_at, ends_at, location, session_type')
    .lte('starts_at', now.toISOString())
    .gte('ends_at', now.toISOString())
    .order('starts_at')
    .limit(3)

  // Also find sessions starting in the next 30 min
  const { data: upcomingSessions } = await supabase
    .from('sessions')
    .select('id, title, starts_at, ends_at, location, session_type')
    .gt('starts_at', now.toISOString())
    .lte('starts_at', new Date(now.getTime() + 30 * 60 * 1000).toISOString())
    .order('starts_at')
    .limit(3)

  const activeSessions = [...(sessions ?? []), ...(upcomingSessions ?? [])]

  // Check if already checked in to any active session
  const activeSessionIds = activeSessions.map((s) => s.id)
  let alreadyCheckedIn: string[] = []

  if (activeSessionIds.length > 0) {
    const { data: existingCheckins } = await supabase
      .from('check_ins')
      .select('session_id')
      .eq('athlete_id', profile.id)
      .in('session_id', activeSessionIds)
      .gte('checked_in_at', new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString())

    alreadyCheckedIn = (existingCheckins ?? []).map((c: { session_id: string }) => c.session_id)
  }

  // Next upcoming session (beyond the 30-min window)
  const { data: nextSessionData } = await supabase
    .from('sessions')
    .select('id, title, starts_at, location')
    .gt('starts_at', new Date(now.getTime() + 30 * 60 * 1000).toISOString())
    .order('starts_at')
    .limit(1)

  const nextSession = nextSessionData?.[0] ?? null

  return (
    <AppLayout profile={profile}>
      <div className="min-h-[calc(100vh-3.5rem)] lg:min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-bold text-center text-gray-900 mb-8">Check in</h1>

          {activeSessions.length > 0 ? (
            <div className="space-y-4">
              {activeSessions.map((session) => (
                <CheckinButton
                  key={session.id}
                  session={session as Session}
                  athleteId={profile.id}
                  alreadyCheckedIn={alreadyCheckedIn.includes(session.id)}
                />
              ))}
            </div>
          ) : (
            <div className="card p-8 text-center">
              <p className="text-4xl mb-4">🥋</p>
              <p className="text-lg font-semibold text-gray-700">No session right now</p>

              {nextSession ? (
                <div className="mt-4 text-sm text-gray-500">
                  <p>Next session:</p>
                  <p className="font-medium text-gray-700 mt-1">{nextSession.title}</p>
                  <p className="mt-1">
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
                    <p className="text-xs text-gray-400 mt-1">📍 {nextSession.location}</p>
                  )}
                </div>
              ) : (
                <p className="mt-4 text-sm text-gray-400">No upcoming sessions scheduled.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
