import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentProfile, createServerClient } from '@/lib/supabase-server'
import AppLayout from '@/components/AppLayout'
import { getBeltColor } from '@/lib/belt-colors'
import type { Profile } from '@/lib/types'

export default async function MembersPage({
  searchParams,
}: {
  searchParams: { q?: string; filter?: string }
}) {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')
  if (profile.role !== 'admin') redirect('/dashboard')

  const supabase = createServerClient()
  const q = searchParams.q?.toLowerCase() ?? ''
  const filter = searchParams.filter ?? 'all'

  let query = supabase
    .from('profiles')
    .select('id, full_name, email, belt_rank, joined_at, active, avatar_url, role')
    .order('full_name')

  if (filter === 'active') query = query.eq('active', true)
  if (filter === 'inactive') query = query.eq('active', false)

  const { data: members } = await query

  const filtered = (members ?? []).filter((m: Partial<Profile>) => {
    if (!q) return true
    return (
      m.full_name?.toLowerCase().includes(q) ||
      m.email?.toLowerCase().includes(q) ||
      m.belt_rank?.toLowerCase().includes(q)
    )
  })

  return (
    <AppLayout profile={profile}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Members</h1>
          <Link href="/admin/members/new" className="btn-primary">
            + Add member
          </Link>
        </div>

        {/* Search + filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <form method="get" className="flex-1">
            <input
              name="q"
              defaultValue={q}
              type="search"
              placeholder="Search by name, email, or belt…"
              className="input"
            />
            {filter !== 'all' && <input type="hidden" name="filter" value={filter} />}
          </form>
          <div className="flex gap-2">
            {(['all', 'active', 'inactive'] as const).map((f) => (
              <Link
                key={f}
                href={`/admin/members?filter=${f}${q ? `&q=${q}` : ''}`}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors capitalize ${
                  filter === f
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {f}
              </Link>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p className="text-lg">No members found</p>
              {q && <p className="text-sm mt-1">Try a different search term.</p>}
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Name
                  </th>
                  <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Belt
                  </th>
                  <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Joined
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filtered.map((m: Partial<Profile> & { id: string }) => (
                  <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                          {m.full_name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{m.full_name}</p>
                          <p className="text-xs text-gray-500">{m.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden sm:table-cell px-4 py-3">
                      {m.belt_rank ? (
                        <span className={`belt-badge ${getBeltColor(m.belt_rank)}`}>
                          {m.belt_rank}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="hidden md:table-cell px-4 py-3 text-sm text-gray-500">
                      {m.joined_at
                        ? new Date(m.joined_at).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`belt-badge ${
                          m.active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {m.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/members/${m.id}`}
                        className="text-sm text-blue-600 hover:underline mr-3"
                      >
                        View
                      </Link>
                      <Link
                        href={`/admin/members/${m.id}`}
                        className="text-sm text-gray-600 hover:underline"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <p className="text-xs text-gray-400 mt-3">
          {filtered.length} member{filtered.length !== 1 ? 's' : ''}
        </p>
      </div>
    </AppLayout>
  )
}
