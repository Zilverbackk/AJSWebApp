import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentProfile, createServerClient } from '@/lib/supabase-server'
import AppLayout from '@/components/AppLayout'
import { getBeltColor } from '@/lib/belt-colors'
import type { Profile } from '@/lib/types'

export default async function TrainerAthletesPage({
  searchParams,
}: {
  searchParams: { q?: string }
}) {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')
  if (profile.role !== 'admin' && profile.role !== 'trainer') redirect('/dashboard')

  const supabase = createServerClient()
  const q = searchParams.q?.toLowerCase() ?? ''

  const { data: athletes } = await supabase
    .from('profiles')
    .select('id, full_name, email, belt_rank, joined_at, active, avatar_url')
    .eq('role', 'athlete')
    .eq('active', true)
    .order('full_name')

  const filtered = (athletes ?? []).filter((a: Partial<Profile>) => {
    if (!q) return true
    return a.full_name?.toLowerCase().includes(q) || a.email?.toLowerCase().includes(q)
  })

  return (
    <AppLayout profile={profile}>
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Athletes</h1>

        <form method="get" className="mb-5">
          <input
            name="q"
            defaultValue={q}
            type="search"
            placeholder="Search athletes…"
            className="input max-w-xs"
          />
        </form>

        {filtered.length === 0 ? (
          <div className="card p-8 text-center text-gray-500">No athletes found.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((a: Partial<Profile> & { id: string }) => (
              <Link
                key={a.id}
                href={`/trainer/athletes/${a.id}`}
                className="card p-4 hover:shadow-md transition-shadow flex items-center gap-3"
              >
                <div className="h-12 w-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                  {a.full_name?.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">{a.full_name}</p>
                  {a.belt_rank ? (
                    <span className={`belt-badge text-xs mt-0.5 ${getBeltColor(a.belt_rank)}`}>
                      {a.belt_rank}
                    </span>
                  ) : (
                    <p className="text-xs text-gray-400">No belt assigned</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
