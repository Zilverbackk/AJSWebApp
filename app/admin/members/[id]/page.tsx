import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getCurrentProfile, createServerClient } from '@/lib/supabase-server'
import AppLayout from '@/components/AppLayout'
import MemberCard from '@/components/MemberCard'
import EditMemberForm from './EditMemberForm'
import type { Profile } from '@/lib/types'

export default async function MemberDetailPage({ params }: { params: { id: string } }) {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')
  if (profile.role !== 'admin') redirect('/dashboard')

  const supabase = createServerClient()

  const [memberRes, checkinCountRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', params.id).single(),
    supabase
      .from('check_ins')
      .select('id', { count: 'exact', head: true })
      .eq('athlete_id', params.id),
  ])

  if (!memberRes.data) notFound()

  const member = memberRes.data as Profile
  const checkinCount = checkinCountRes.count ?? 0

  return (
    <AppLayout profile={profile}>
      <div className="p-6 max-w-2xl mx-auto">
        <div className="mb-6">
          <Link href="/admin/members" className="text-sm text-gray-500 hover:text-gray-700">
            ← Back to members
          </Link>
        </div>

        {/* Header card */}
        <div className="card mb-6">
          <MemberCard profile={member} checkinCount={checkinCount} />
        </div>

        {/* Edit form */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-5">Edit profile</h2>
          <EditMemberForm member={member} />
        </div>
      </div>
    </AppLayout>
  )
}
