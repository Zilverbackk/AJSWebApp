import { redirect } from 'next/navigation'
import { getCurrentProfile, createServerClient } from '@/lib/supabase-server'
import AppLayout from '@/components/AppLayout'
import ProgramView from './ProgramView'
import type { Program } from '@/lib/types'

export default async function AthleteProgramsPage() {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')

  const supabase = createServerClient()
  const { data: programs } = await supabase
    .from('programs')
    .select('*')
    .eq('athlete_id', profile.id)
    .order('created_at', { ascending: false })

  const activePrograms = (programs ?? []).filter((p: Program) => p.status === 'active')
  const archivedPrograms = (programs ?? []).filter((p: Program) => p.status === 'archived')

  return (
    <AppLayout profile={profile}>
      <div className="p-6 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">My Programs</h1>

        {programs?.length === 0 ? (
          <div className="card p-8 text-center text-gray-500">
            <p className="text-lg">No programs assigned yet.</p>
            <p className="text-sm mt-2">Your trainer will assign strength programs here.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {activePrograms.map((p: Program) => (
              <ProgramView key={p.id} program={p} athleteId={profile.id} />
            ))}

            {archivedPrograms.length > 0 && (
              <details>
                <summary className="cursor-pointer text-sm font-medium text-gray-500 hover:text-gray-700 select-none">
                  Show archived programs ({archivedPrograms.length})
                </summary>
                <div className="mt-4 space-y-4">
                  {archivedPrograms.map((p: Program) => (
                    <ProgramView key={p.id} program={p} athleteId={profile.id} archived />
                  ))}
                </div>
              </details>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
