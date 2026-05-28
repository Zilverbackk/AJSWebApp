import { redirect } from 'next/navigation'
import { getCurrentProfile, createServerClient } from '@/lib/supabase-server'
import AppLayout from '@/components/AppLayout'
import MemberCard from '@/components/MemberCard'
import CheckinHeatmap from '@/app/trainer/athletes/[id]/CheckinHeatmap'

export default async function AthleteProfilePage() {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')

  const supabase = createServerClient()
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: checkins } = await supabase
    .from('check_ins')
    .select('checked_in_at')
    .eq('athlete_id', profile.id)
    .gte('checked_in_at', thirtyDaysAgo.toISOString())

  const { count: totalCheckinCount } = await supabase
    .from('check_ins')
    .select('id', { count: 'exact', head: true })
    .eq('athlete_id', profile.id)

  const checkinDates = (checkins ?? []).map((c: { checked_in_at: string }) => c.checked_in_at)

  return (
    <AppLayout profile={profile}>
      <div className="p-6 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">My Profile</h1>

        <div className="card mb-6">
          <MemberCard profile={profile} checkinCount={totalCheckinCount ?? 0} />
        </div>

        {/* Profile fields (read-only) */}
        <div className="card p-5 mb-6 space-y-3">
          <h2 className="font-semibold text-gray-900 mb-4">Details</h2>
          <Field label="Email" value={profile.email} />
          <Field label="Phone" value={profile.phone ?? '—'} />
          <Field
            label="Date of birth"
            value={
              profile.date_of_birth
                ? new Date(profile.date_of_birth).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })
                : '—'
            }
          />
          <Field
            label="Member since"
            value={
              profile.joined_at
                ? new Date(profile.joined_at).toLocaleDateString('en-GB', {
                    month: 'long',
                    year: 'numeric',
                  })
                : '—'
            }
          />
        </div>

        {/* Check-in heatmap */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Training — last 30 days</h2>
          <CheckinHeatmap checkinDates={checkinDates} />
          <p className="text-sm text-gray-500 mt-3">
            {checkinDates.length} session{checkinDates.length !== 1 ? 's' : ''} in the last 30 days
          </p>
        </div>
      </div>
    </AppLayout>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-sm font-medium text-gray-500 w-36 flex-shrink-0">{label}</span>
      <span className="text-sm text-gray-900">{value}</span>
    </div>
  )
}
