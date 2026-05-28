import { redirect, notFound } from 'next/navigation'
import { getCurrentProfile, createServerClient } from '@/lib/supabase-server'
import AppLayout from '@/components/AppLayout'
import ProgramBuilder from './ProgramBuilder'
import Link from 'next/link'
import type { Profile } from '@/lib/types'

export default async function NewProgramPage({ params }: { params: { id: string } }) {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')
  if (profile.role !== 'admin' && profile.role !== 'trainer') redirect('/dashboard')

  const supabase = createServerClient()
  const { data: athlete } = await supabase
    .from('profiles')
    .select('id, full_name, belt_rank')
    .eq('id', params.id)
    .single()

  if (!athlete) notFound()

  return (
    <AppLayout profile={profile}>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="mb-4">
          <Link
            href={`/trainer/athletes/${params.id}`}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Back to {(athlete as Pick<Profile, 'full_name'>).full_name}
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">New strength program</h1>
        <ProgramBuilder athleteId={params.id} trainerId={profile.id} />
      </div>
    </AppLayout>
  )
}
