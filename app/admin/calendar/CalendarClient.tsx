'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Session, SessionType, Team, Role } from '@/lib/types'

// ─── Constants ────────────────────────────────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDatetimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function seriesLastDate(firstStart: string, weeks: number): string {
  const last = addDays(new Date(firstStart), (weeks - 1) * 7)
  return last.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface SessionForm {
  title: string
  description: string
  session_type: SessionType
  starts_at: string
  ends_at: string
  location: string
  team_id: string  // '' = all-club / null
}

type ModalState =
  | { kind: 'none' }
  | { kind: 'detail'; session: Session }
  | { kind: 'create'; defaultDate: string }
  | { kind: 'edit'; session: Session; scope: 'single' | 'series' }
  | { kind: 'delete-confirm'; session: Session; scope: 'single' | 'series'; seriesCount: number }

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  sessions: Session[]
  teams: Team[]
  year: number
  month: number
  canEdit: boolean
  userRole: Role
  userTeamIds: string[]  // team IDs the trainer coaches — empty for admin
}

export default function CalendarClient({
  sessions, teams, year, month, canEdit, userRole, userTeamIds,
}: Props) {
  const router = useRouter()
  const [modal, setModal] = useState<ModalState>({ kind: 'none' })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const blankForm = (dateStr: string): SessionForm => ({
    title: '',
    description: '',
    session_type: 'regular',
    starts_at: `${dateStr}T18:00`,
    ends_at: `${dateStr}T20:00`,
    location: '',
    team_id: '',
  })

  const [createForm, setCreateForm] = useState<SessionForm>(blankForm(''))
  const [repeatWeekly, setRepeatWeekly] = useState(false)
  const [repeatWeeks, setRepeatWeeks] = useState(8)
  const [editForm, setEditForm] = useState<SessionForm>(blankForm(''))

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const teamById = (id: string | null) => teams.find((t) => t.id === id) ?? null

  /**
   * For a trainer: a session is "mine" if it has no team, or its team is one of theirs.
   * For admin: everything is full opacity.
   */
  const isMySession = (s: Session): boolean => {
    if (userRole === 'admin') return true
    if (!s.team_id) return true  // all-club sessions are always visible at full opacity
    return userTeamIds.includes(s.team_id)
  }

  // ── Calendar grid ────────────────────────────────────────────────────────────

  const firstDay = new Date(year, month - 1, 1)
  const totalDays = new Date(year, month, 0).getDate()
  const startDow = firstDay.getDay()

  const cells: (number | null)[] = [
    ...Array(startDow).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

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
  const today = new Date()

  // ── Modal openers ────────────────────────────────────────────────────────────

  const openCreate = (day: number) => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    setCreateForm(blankForm(dateStr))
    setRepeatWeekly(false)
    setRepeatWeeks(8)
    setFormError(null)
    setModal({ kind: 'create', defaultDate: dateStr })
  }

  const openEdit = (session: Session, scope: 'single' | 'series') => {
    setEditForm({
      title: session.title,
      description: session.description ?? '',
      session_type: session.session_type,
      starts_at: toDatetimeLocal(new Date(session.starts_at)),
      ends_at: toDatetimeLocal(new Date(session.ends_at)),
      location: session.location ?? '',
      team_id: session.team_id ?? '',
    })
    setFormError(null)
    setModal({ kind: 'edit', session, scope })
  }

  const openDeleteConfirm = async (session: Session, scope: 'single' | 'series') => {
    let seriesCount = 1
    if (scope === 'series' && session.recurrence_group_id) {
      const { count } = await supabase
        .from('sessions')
        .select('id', { count: 'exact', head: true })
        .eq('recurrence_group_id', session.recurrence_group_id)
      seriesCount = count ?? 1
    }
    setModal({ kind: 'delete-confirm', session, scope, seriesCount })
  }

  // ── Create handler ───────────────────────────────────────────────────────────

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setFormError(null)

    const startDate = new Date(createForm.starts_at)
    const endDate = new Date(createForm.ends_at)
    if (endDate <= startDate) { setFormError('End time must be after start time.'); setSaving(false); return }

    const durationMs = endDate.getTime() - startDate.getTime()
    const recurrence_group_id = repeatWeekly && repeatWeeks > 1 ? crypto.randomUUID() : null
    const weeks = repeatWeekly ? Math.max(1, repeatWeeks) : 1

    const rows = Array.from({ length: weeks }, (_, i) => {
      const s = addDays(startDate, i * 7)
      const e = new Date(s.getTime() + durationMs)
      return {
        title: createForm.title,
        description: createForm.description || null,
        session_type: createForm.session_type,
        starts_at: s.toISOString(),
        ends_at: e.toISOString(),
        location: createForm.location || null,
        team_id: createForm.team_id || null,
        recurrence_group_id,
      }
    })

    const { error } = await supabase.from('sessions').insert(rows)
    if (error) { setFormError(error.message); setSaving(false); return }

    setModal({ kind: 'none' })
    router.refresh()
    setSaving(false)
  }

  // ── Edit handler ─────────────────────────────────────────────────────────────

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (modal.kind !== 'edit') return
    setSaving(true)
    setFormError(null)

    const { session, scope } = modal
    const newStart = new Date(editForm.starts_at)
    const newEnd = new Date(editForm.ends_at)
    if (newEnd <= newStart) { setFormError('End time must be after start time.'); setSaving(false); return }

    const sharedFields = {
      title: editForm.title,
      description: editForm.description || null,
      session_type: editForm.session_type,
      location: editForm.location || null,
      team_id: editForm.team_id || null,
    }

    if (scope === 'single' || !session.recurrence_group_id) {
      const { error } = await supabase
        .from('sessions')
        .update({ ...sharedFields, starts_at: newStart.toISOString(), ends_at: newEnd.toISOString() })
        .eq('id', session.id)
      if (error) { setFormError(error.message); setSaving(false); return }
    } else {
      const { data: seriesSessions, error: fetchError } = await supabase
        .from('sessions')
        .select('id, starts_at, ends_at')
        .eq('recurrence_group_id', session.recurrence_group_id)
        .order('starts_at')
      if (fetchError) { setFormError(fetchError.message); setSaving(false); return }

      const newDurationMs = newEnd.getTime() - newStart.getTime()
      const newStartHour = newStart.getHours()
      const newStartMin = newStart.getMinutes()

      const { error: textError } = await supabase
        .from('sessions')
        .update(sharedFields)
        .eq('recurrence_group_id', session.recurrence_group_id)
      if (textError) { setFormError(textError.message); setSaving(false); return }

      for (const s of seriesSessions ?? []) {
        const updatedStart = new Date(s.starts_at)
        updatedStart.setHours(newStartHour, newStartMin, 0, 0)
        const updatedEnd = new Date(updatedStart.getTime() + newDurationMs)
        const { error } = await supabase
          .from('sessions')
          .update({ starts_at: updatedStart.toISOString(), ends_at: updatedEnd.toISOString() })
          .eq('id', s.id)
        if (error) { setFormError(error.message); setSaving(false); return }
      }
    }

    setModal({ kind: 'none' })
    router.refresh()
    setSaving(false)
  }

  // ── Delete handler ───────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (modal.kind !== 'delete-confirm') return
    setSaving(true)
    const { session, scope } = modal

    if (scope === 'series' && session.recurrence_group_id) {
      const { error } = await supabase.from('sessions').delete().eq('recurrence_group_id', session.recurrence_group_id)
      if (error) { setFormError(error.message); setSaving(false); return }
    } else {
      const { error } = await supabase.from('sessions').delete().eq('id', session.id)
      if (error) { setFormError(error.message); setSaving(false); return }
    }

    setModal({ kind: 'none' })
    router.refresh()
    setSaving(false)
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push(`/admin/calendar?year=${prevYear}&month=${prevMonth}`)} className="btn-secondary px-3 py-1.5">‹</button>
          <h1 className="text-xl font-bold text-gray-900 w-44 text-center">{MONTH_NAMES[month - 1]} {year}</h1>
          <button onClick={() => router.push(`/admin/calendar?year=${nextYear}&month=${nextMonth}`)} className="btn-secondary px-3 py-1.5">›</button>
        </div>
        {canEdit && (
          <button onClick={() => openCreate(today.getDate())} className="btn-primary">+ New session</button>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 mb-4">
        {(Object.entries(SESSION_COLORS) as [SessionType, string][]).map(([type, color]) => (
          <span key={type} className={`belt-badge ${color} capitalize`}>{type}</span>
        ))}
        <span className="belt-badge bg-amber-50 text-amber-700 border border-amber-200">↺ recurring</span>
        {userRole === 'trainer' && (
          <span className="belt-badge bg-gray-100 text-gray-400">faded = other teams</span>
        )}
      </div>

      {/* Calendar grid */}
      <div className="card overflow-hidden">
        <div className="grid grid-cols-7 border-b border-gray-200">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="py-2 text-center text-xs font-medium text-gray-500 uppercase">{d}</div>
          ))}
        </div>

        {Array.from({ length: cells.length / 7 }, (_, weekIdx) => (
          <div key={weekIdx} className="grid grid-cols-7 border-b border-gray-100 last:border-0">
            {cells.slice(weekIdx * 7, weekIdx * 7 + 7).map((day, i) => {
              const isToday = day !== null && today.getDate() === day && today.getMonth() + 1 === month && today.getFullYear() === year
              const daySessions = day ? (sessionsByDay[day] ?? []) : []

              return (
                <div
                  key={i}
                  onClick={() => canEdit && day && openCreate(day)}
                  className={`min-h-20 p-1.5 border-r border-gray-100 last:border-0 ${day && canEdit ? 'cursor-pointer hover:bg-gray-50' : ''} ${!day ? 'bg-gray-50' : ''}`}
                >
                  {day && (
                    <>
                      <p className={`text-xs font-medium mb-1 w-5 h-5 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white' : 'text-gray-600'}`}>
                        {day}
                      </p>
                      <div className="space-y-0.5">
                        {daySessions.slice(0, 3).map((s) => {
                          const mine = isMySession(s)
                          const team = teamById(s.team_id)
                          return (
                            <button
                              key={s.id}
                              onClick={(e) => { e.stopPropagation(); setModal({ kind: 'detail', session: s }) }}
                              className={`w-full text-left text-xs px-1.5 py-0.5 rounded flex items-center gap-0.5 ${SESSION_COLORS[s.session_type]} ${!mine ? 'opacity-35' : ''}`}
                            >
                              {s.recurrence_group_id && <span className="flex-shrink-0 opacity-60">↺</span>}
                              <span className="truncate">
                                {new Date(s.starts_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} {s.title}
                              </span>
                              {team && <span className="flex-shrink-0 ml-auto opacity-70 text-[10px]">{team.name}</span>}
                            </button>
                          )
                        })}
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

      {/* ── Detail modal ── */}
      {modal.kind === 'detail' && (() => {
        const s = modal.session
        const team = teamById(s.team_id)
        return (
          <Modal onClose={() => setModal({ kind: 'none' })}>
            <div className="space-y-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h2 className="text-lg font-semibold text-gray-900">{s.title}</h2>
                  <span className={`belt-badge ${SESSION_COLORS[s.session_type]} capitalize`}>{s.session_type}</span>
                  {s.recurrence_group_id && <span className="belt-badge bg-amber-50 text-amber-700 border border-amber-200">↺ recurring</span>}
                  {team && <span className="belt-badge bg-gray-100 text-gray-700">{team.name}</span>}
                </div>
                <p className="text-sm text-gray-500">
                  {new Date(s.starts_at).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })},{' '}
                  {new Date(s.starts_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                  {' – '}
                  {new Date(s.ends_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </p>
                {s.location && <p className="text-sm text-gray-500 mt-1">📍 {s.location}</p>}
                {s.description && <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">{s.description}</p>}
              </div>

              {canEdit && (
                <div className="border-t border-gray-100 pt-3 space-y-2">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase mb-1.5">Edit</p>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => openEdit(s, 'single')} className="btn-secondary text-xs py-1.5 px-3">This session</button>
                      {s.recurrence_group_id && (
                        <button onClick={() => openEdit(s, 'series')} className="btn-secondary text-xs py-1.5 px-3">Whole series ↺</button>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase mb-1.5">Delete</p>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => openDeleteConfirm(s, 'single')} className="text-xs py-1.5 px-3 rounded-md border border-red-200 text-red-600 hover:bg-red-50 transition-colors">This session</button>
                      {s.recurrence_group_id && (
                        <button onClick={() => openDeleteConfirm(s, 'series')} className="text-xs py-1.5 px-3 rounded-md border border-red-200 text-red-600 hover:bg-red-50 transition-colors">Whole series ↺</button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Modal>
        )
      })()}

      {/* ── Create modal ── */}
      {modal.kind === 'create' && (
        <Modal onClose={() => setModal({ kind: 'none' })}>
          <h2 className="text-lg font-semibold text-gray-900 mb-5">New session</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <SessionFormFields form={createForm} teams={teams} onChange={(k, v) => setCreateForm((p) => ({ ...p, [k]: v }))} />

            {/* Repeat section */}
            <div className="border-t border-gray-100 pt-4 space-y-3">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input type="checkbox" checked={repeatWeekly} onChange={(e) => setRepeatWeekly(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">Repeat weekly</span>
              </label>
              {repeatWeekly && (
                <div className="pl-6 space-y-2">
                  <div className="flex items-center gap-3">
                    <label className="text-sm text-gray-600 whitespace-nowrap">For</label>
                    <input type="number" min={2} max={52} value={repeatWeeks} onChange={(e) => setRepeatWeeks(Math.max(2, Math.min(52, parseInt(e.target.value) || 2)))} className="input w-20" />
                    <span className="text-sm text-gray-600">weeks</span>
                  </div>
                  {createForm.starts_at && (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2.5 py-1.5">
                      Creates {repeatWeeks} sessions — first {new Date(createForm.starts_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}, last {seriesLastDate(createForm.starts_at, repeatWeeks)}
                    </p>
                  )}
                </div>
              )}
            </div>

            {formError && <ErrorMsg msg={formError} />}
            <div className="flex gap-3">
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Saving…' : repeatWeekly ? `Create ${repeatWeeks} sessions` : 'Create session'}
              </button>
              <button type="button" onClick={() => setModal({ kind: 'none' })} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Edit modal ── */}
      {modal.kind === 'edit' && (
        <Modal onClose={() => setModal({ kind: 'none' })}>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Edit session</h2>
          {modal.scope === 'series' && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2.5 py-1.5 mb-4">
              Editing whole series — time and details update across all sessions in this recurring block.
            </p>
          )}
          <form onSubmit={handleEdit} className="space-y-4 mt-4">
            <SessionFormFields form={editForm} teams={teams} onChange={(k, v) => setEditForm((p) => ({ ...p, [k]: v }))} />
            {formError && <ErrorMsg msg={formError} />}
            <div className="flex gap-3">
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Saving…' : modal.scope === 'series' ? 'Save whole series' : 'Save session'}
              </button>
              <button type="button" onClick={() => setModal({ kind: 'none' })} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Delete confirm modal ── */}
      {modal.kind === 'delete-confirm' && (
        <Modal onClose={() => setModal({ kind: 'none' })}>
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">
                {modal.scope === 'series' ? 'Delete whole series?' : 'Delete this session?'}
              </h2>
              <p className="text-sm text-gray-600">
                {modal.scope === 'series'
                  ? <>Permanently deletes <strong>{modal.seriesCount} session{modal.seriesCount !== 1 ? 's' : ''}</strong> in the series "{modal.session.title}". Cannot be undone.</>
                  : <>Permanently deletes "<strong>{modal.session.title}</strong>" on {new Date(modal.session.starts_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}. Cannot be undone.</>
                }
              </p>
            </div>
            {formError && <ErrorMsg msg={formError} />}
            <div className="flex gap-3">
              <button onClick={handleDelete} disabled={saving} className="btn-danger">
                {saving ? 'Deleting…' : modal.scope === 'series' ? `Delete ${modal.seriesCount} session${modal.seriesCount !== 1 ? 's' : ''}` : 'Delete session'}
              </button>
              <button onClick={() => setModal({ kind: 'none' })} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SessionFormFields({
  form, teams, onChange,
}: {
  form: SessionForm
  teams: Team[]
  onChange: (key: keyof SessionForm, value: string) => void
}) {
  return (
    <div className="space-y-3">
      <div>
        <label className="label">Title *</label>
        <input required value={form.title} onChange={(e) => onChange('title', e.target.value)} className="input" placeholder="Randori training" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Type</label>
          <select value={form.session_type} onChange={(e) => onChange('session_type', e.target.value)} className="input">
            <option value="regular">Regular</option>
            <option value="elite">Elite</option>
            <option value="strength">Strength</option>
            <option value="competition">Competition</option>
          </select>
        </div>
        <div>
          <label className="label">Team</label>
          <select value={form.team_id} onChange={(e) => onChange('team_id', e.target.value)} className="input">
            <option value="">All club</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Start *</label>
          <input required type="datetime-local" value={form.starts_at} onChange={(e) => onChange('starts_at', e.target.value)} className="input" />
        </div>
        <div>
          <label className="label">End *</label>
          <input required type="datetime-local" value={form.ends_at} onChange={(e) => onChange('ends_at', e.target.value)} className="input" />
        </div>
      </div>
      <div>
        <label className="label">Location</label>
        <input value={form.location} onChange={(e) => onChange('location', e.target.value)} className="input" placeholder="Main dojo" />
      </div>
      <div>
        <label className="label">Description</label>
        <textarea value={form.description} onChange={(e) => onChange('description', e.target.value)} className="input" rows={2} placeholder="Optional notes for athletes" />
      </div>
    </div>
  )
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl leading-none" aria-label="Close">×</button>
        {children}
      </div>
    </div>
  )
}

function ErrorMsg({ msg }: { msg: string }) {
  return <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{msg}</p>
}
