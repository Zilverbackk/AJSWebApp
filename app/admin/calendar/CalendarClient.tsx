'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Session, SessionType } from '@/lib/types'

const SESSION_COLORS: Record<SessionType, string> = {
  regular: 'bg-blue-100 text-blue-800',
  elite: 'bg-purple-100 text-purple-800',
  strength: 'bg-green-100 text-green-800',
  competition: 'bg-red-100 text-red-800',
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

interface Props {
  sessions: Session[]
  year: number
  month: number
  canEdit: boolean
}

type ModalMode = 'view' | 'create'

export default function CalendarClient({ sessions, year, month, canEdit }: Props) {
  const router = useRouter()
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createDate, setCreateDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [newSession, setNewSession] = useState({
    title: '',
    description: '',
    session_type: 'regular' as SessionType,
    starts_at: '',
    ends_at: '',
    location: '',
  })

  // Build calendar grid
  const firstDay = new Date(year, month - 1, 1)
  const lastDay = new Date(year, month, 0)
  const startDow = firstDay.getDay() // 0=Sun
  const totalDays = lastDay.getDate()

  // Group sessions by day
  const sessionsByDay: Record<number, Session[]> = {}
  sessions.forEach((s) => {
    const d = new Date(s.starts_at).getDate()
    if (!sessionsByDay[d]) sessionsByDay[d] = []
    sessionsByDay[d].push(s)
  })

  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear = month === 1 ? year - 1 : year
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year

  const openCreate = (day: number) => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    setCreateDate(dateStr)
    setNewSession((prev) => ({
      ...prev,
      starts_at: `${dateStr}T18:00`,
      ends_at: `${dateStr}T20:00`,
    }))
    setShowCreateModal(true)
    setFormError(null)
  }

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setFormError(null)

    const { error } = await supabase.from('sessions').insert({
      title: newSession.title,
      description: newSession.description || null,
      session_type: newSession.session_type,
      starts_at: new Date(newSession.starts_at).toISOString(),
      ends_at: new Date(newSession.ends_at).toISOString(),
      location: newSession.location || null,
    })

    if (error) {
      setFormError(error.message)
      setSaving(false)
      return
    }

    setShowCreateModal(false)
    setNewSession({ title: '', description: '', session_type: 'regular', starts_at: '', ends_at: '', location: '' })
    router.refresh()
    setSaving(false)
  }

  const cells: (number | null)[] = [
    ...Array(startDow).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ]
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null)

  const today = new Date()

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push(`/admin/calendar?year=${prevYear}&month=${prevMonth}`)}
            className="btn-secondary px-3 py-1.5"
          >
            ‹
          </button>
          <h1 className="text-xl font-bold text-gray-900 min-w-40 text-center">
            {MONTH_NAMES[month - 1]} {year}
          </h1>
          <button
            onClick={() => router.push(`/admin/calendar?year=${nextYear}&month=${nextMonth}`)}
            className="btn-secondary px-3 py-1.5"
          >
            ›
          </button>
        </div>
        {canEdit && (
          <button onClick={() => openCreate(today.getDate())} className="btn-primary">
            + New session
          </button>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 mb-4">
        {(Object.entries(SESSION_COLORS) as [SessionType, string][]).map(([type, color]) => (
          <span key={type} className={`belt-badge ${color} capitalize`}>{type}</span>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="card overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-gray-200">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="py-2 text-center text-xs font-medium text-gray-500 uppercase">
              {d}
            </div>
          ))}
        </div>

        {/* Weeks */}
        {Array.from({ length: cells.length / 7 }, (_, weekIdx) => (
          <div key={weekIdx} className="grid grid-cols-7 border-b border-gray-100 last:border-0">
            {cells.slice(weekIdx * 7, weekIdx * 7 + 7).map((day, i) => {
              const isToday =
                day !== null &&
                today.getDate() === day &&
                today.getMonth() + 1 === month &&
                today.getFullYear() === year
              const daySessions = day ? (sessionsByDay[day] ?? []) : []

              return (
                <div
                  key={i}
                  onClick={() => canEdit && day && openCreate(day)}
                  className={`min-h-20 p-1.5 border-r border-gray-100 last:border-0 ${
                    day && canEdit ? 'cursor-pointer hover:bg-gray-50' : ''
                  } ${!day ? 'bg-gray-50' : ''}`}
                >
                  {day && (
                    <>
                      <p
                        className={`text-xs font-medium mb-1 w-5 h-5 flex items-center justify-center rounded-full ${
                          isToday ? 'bg-blue-600 text-white' : 'text-gray-600'
                        }`}
                      >
                        {day}
                      </p>
                      <div className="space-y-0.5">
                        {daySessions.slice(0, 3).map((s) => (
                          <button
                            key={s.id}
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedSession(s)
                            }}
                            className={`w-full text-left text-xs px-1.5 py-0.5 rounded truncate ${SESSION_COLORS[s.session_type]}`}
                          >
                            {new Date(s.starts_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} {s.title}
                          </button>
                        ))}
                        {daySessions.length > 3 && (
                          <p className="text-xs text-gray-400 px-1">+{daySessions.length - 3} more</p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Session detail modal */}
      {selectedSession && (
        <Modal onClose={() => setSelectedSession(null)}>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">{selectedSession.title}</h2>
          <p className="text-sm text-gray-500 mb-4">
            {new Date(selectedSession.starts_at).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })},{' '}
            {new Date(selectedSession.starts_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} –{' '}
            {new Date(selectedSession.ends_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </p>
          <span className={`belt-badge ${SESSION_COLORS[selectedSession.session_type]} capitalize mb-3 inline-block`}>
            {selectedSession.session_type}
          </span>
          {selectedSession.location && (
            <p className="text-sm text-gray-600 mt-2">📍 {selectedSession.location}</p>
          )}
          {selectedSession.description && (
            <p className="text-sm text-gray-600 mt-3 whitespace-pre-wrap">{selectedSession.description}</p>
          )}
        </Modal>
      )}

      {/* Create session modal */}
      {showCreateModal && (
        <Modal onClose={() => setShowCreateModal(false)}>
          <h2 className="text-lg font-semibold text-gray-900 mb-5">New session</h2>
          <form onSubmit={handleCreateSession} className="space-y-4">
            <div>
              <label className="label">Title *</label>
              <input
                required
                value={newSession.title}
                onChange={(e) => setNewSession((p) => ({ ...p, title: e.target.value }))}
                className="input"
                placeholder="Randori training"
              />
            </div>
            <div>
              <label className="label">Type</label>
              <select
                value={newSession.session_type}
                onChange={(e) => setNewSession((p) => ({ ...p, session_type: e.target.value as SessionType }))}
                className="input"
              >
                <option value="regular">Regular</option>
                <option value="elite">Elite</option>
                <option value="strength">Strength</option>
                <option value="competition">Competition</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Start *</label>
                <input
                  required
                  type="datetime-local"
                  value={newSession.starts_at}
                  onChange={(e) => setNewSession((p) => ({ ...p, starts_at: e.target.value }))}
                  className="input"
                />
              </div>
              <div>
                <label className="label">End *</label>
                <input
                  required
                  type="datetime-local"
                  value={newSession.ends_at}
                  onChange={(e) => setNewSession((p) => ({ ...p, ends_at: e.target.value }))}
                  className="input"
                />
              </div>
            </div>
            <div>
              <label className="label">Location</label>
              <input
                value={newSession.location}
                onChange={(e) => setNewSession((p) => ({ ...p, location: e.target.value }))}
                className="input"
                placeholder="Main dojo"
              />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea
                value={newSession.description}
                onChange={(e) => setNewSession((p) => ({ ...p, description: e.target.value }))}
                className="input"
                rows={2}
                placeholder="Optional notes for athletes"
              />
            </div>
            {formError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{formError}</p>
            )}
            <div className="flex gap-3">
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Saving…' : 'Create session'}
              </button>
              <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl leading-none"
        >
          ×
        </button>
        {children}
      </div>
    </div>
  )
}
