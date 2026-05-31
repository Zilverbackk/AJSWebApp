'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getBeltColor } from '@/lib/belt-colors'
import type { Session, BeltRank } from '@/lib/types'

interface CheckinRecord {
  id: string
  athlete_id: string
  session_id: string | null
  checked_in_at: string
  profiles: {
    full_name: string
    belt_rank: BeltRank | null
    avatar_url: string | null
  } | null
}

interface Props {
  initialCheckins: CheckinRecord[]
  todaySessions: Session[]
  trainerTeamIds: string[]  // for trainers: their team IDs (to filter realtime events)
  isAdmin: boolean
}

export default function CheckinLiveView({ initialCheckins, todaySessions, trainerTeamIds, isAdmin }: Props) {
  const [checkins, setCheckins] = useState<CheckinRecord[]>(initialCheckins)
  const [newId, setNewId] = useState<string | null>(null)

  const todaySessionIds = new Set(todaySessions.map((s) => s.id))

  useEffect(() => {
    const channel = supabase
      .channel('checkins-live')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'check_ins' },
        async (payload) => {
          const { data } = await supabase
            .from('check_ins')
            .select('id, athlete_id, session_id, checked_in_at, profiles(full_name, belt_rank, avatar_url)')
            .eq('id', payload.new.id)
            .single()

          if (data) {
            // For trainers: only add check-ins from their sessions
            if (!isAdmin && data.session_id && !todaySessionIds.has(data.session_id)) return

            const record: CheckinRecord = {
              ...data,
              profiles: Array.isArray(data.profiles) ? data.profiles[0] ?? null : data.profiles,
            }
            setCheckins((prev) => [record, ...prev])
            setNewId(data.id)
            setTimeout(() => setNewId(null), 3000)
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [isAdmin, todaySessionIds])

  const SESSION_COLORS: Record<string, string> = {
    regular: 'bg-blue-100 text-blue-800',
    elite: 'bg-purple-100 text-purple-800',
    strength: 'bg-green-100 text-green-800',
    competition: 'bg-red-100 text-red-800',
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left: Today's sessions */}
      <div className="lg:col-span-1">
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Today's Sessions</h2>
          {todaySessions.length === 0 ? (
            <p className="text-sm text-gray-500">No sessions today.</p>
          ) : (
            <ul className="space-y-3">
              {todaySessions.map((s) => {
                const now = new Date()
                const isActive = now >= new Date(s.starts_at) && now <= new Date(s.ends_at)
                const sessionCheckins = checkins.filter((c) => c.session_id === s.id)

                return (
                  <li key={s.id} className={`rounded-lg p-3 border ${isActive ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{s.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {new Date(s.starts_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} –{' '}
                          {new Date(s.ends_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div className="text-right flex flex-col items-end gap-1">
                        <span className={`belt-badge ${SESSION_COLORS[s.session_type] ?? ''} capitalize`}>
                          {s.session_type}
                        </span>
                        {isActive && <p className="text-xs text-green-600 font-medium">● Live</p>}
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">{sessionCheckins.length} checked in</p>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Right: Live check-in list */}
      <div className="lg:col-span-2">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Checked in Today</h2>
            <span className="text-2xl font-bold text-blue-600">{checkins.length}</span>
          </div>

          {checkins.length === 0 ? (
            <p className="text-sm text-gray-500">No check-ins yet today.</p>
          ) : (
            <ul className="space-y-2 max-h-[60vh] overflow-y-auto">
              {checkins.map((c) => {
                const p = c.profiles
                const initials = p?.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) ?? '?'

                return (
                  <li
                    key={c.id}
                    className={`flex items-center gap-3 rounded-lg p-3 transition-colors ${
                      newId === c.id ? 'bg-green-50 border border-green-200' : 'bg-gray-50'
                    }`}
                  >
                    <div className="h-9 w-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{p?.full_name ?? 'Unknown'}</p>
                      {p?.belt_rank && (
                        <span className={`belt-badge text-xs ${getBeltColor(p.belt_rank)}`}>{p.belt_rank}</span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {new Date(c.checked_in_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {newId === c.id && <span className="text-xs text-green-600 font-medium">New ✓</span>}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
