'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Session } from '@/lib/types'

interface Props {
  session: Session
  athleteId: string
  alreadyCheckedIn: boolean
}

export default function CheckinButton({ session, athleteId, alreadyCheckedIn }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(alreadyCheckedIn)
  const [error, setError] = useState<string | null>(null)

  const isUpcoming = new Date(session.starts_at) > new Date()

  const handleCheckin = async () => {
    if (done) return
    setLoading(true)
    setError(null)

    const { error } = await supabase.from('check_ins').insert({
      athlete_id: athleteId,
      session_id: session.id,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setDone(true)
    setLoading(false)
    router.refresh()
  }

  const sessionTypeColors: Record<string, string> = {
    regular: 'bg-blue-50 border-blue-200',
    elite: 'bg-purple-50 border-purple-200',
    strength: 'bg-green-50 border-green-200',
    competition: 'bg-red-50 border-red-200',
  }

  return (
    <div className={`card p-5 border ${sessionTypeColors[session.session_type] ?? ''}`}>
      <p className="font-semibold text-gray-900">{session.title}</p>
      <p className="text-sm text-gray-500 mt-0.5">
        {new Date(session.starts_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} –{' '}
        {new Date(session.ends_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
      </p>
      {session.location && (
        <p className="text-xs text-gray-400 mt-0.5">📍 {session.location}</p>
      )}
      {isUpcoming && (
        <p className="text-xs text-amber-600 mt-1 font-medium">
          Starts in {Math.round((new Date(session.starts_at).getTime() - Date.now()) / 60000)} min
        </p>
      )}

      {error && (
        <p className="text-sm text-red-600 mt-2">{error}</p>
      )}

      {done ? (
        <div className="mt-4 flex items-center justify-center gap-2 bg-green-600 text-white rounded-lg py-3 px-4">
          <span className="text-xl">✓</span>
          <span className="font-semibold">Checked in!</span>
        </div>
      ) : (
        <button
          onClick={handleCheckin}
          disabled={loading}
          className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg py-3 px-4 text-lg transition-colors disabled:opacity-50"
        >
          {loading ? 'Checking in…' : 'Check in'}
        </button>
      )}
    </div>
  )
}
