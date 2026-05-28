import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentProfile } from '@/lib/supabase-server'
import AppLayout from '@/components/AppLayout'
import NewMemberForm from './NewMemberForm'

export default async function NewMemberPage() {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')
  if (profile.role !== 'admin') redirect('/dashboard')

  return (
    <AppLayout profile={profile}>
      <div className="p-6 max-w-2xl mx-auto">
        <div className="mb-6">
          <Link href="/admin/members" className="text-sm text-gray-500 hover:text-gray-700">
            ← Back to members
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">Add new member</h1>
        </div>
        <div className="card p-6">
          <NewMemberForm />
        </div>
      </div>
    </AppLayout>
  )
}
