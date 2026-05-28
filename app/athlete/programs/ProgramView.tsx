'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Exercise, Program } from '@/lib/types'

interface Props {
  program: Program
  athleteId: string
  archived?: boolean
}

export default function ProgramView({ program, athleteId, archived = false }: Props) {
  const [logModal, setLogModal] = useState<Exercise | null>(null)
  const [logForm, setLogForm] = useState({ sets_completed: '', reps_completed: '', weight_used: '', note: '' })
  const [logging, setLogging] = useState(false)
  const [logError, setLogError] = useState<string | null>(null)
  const [loggedIds, setLoggedIds] = useState<Set<string>>(new Set())

  const openLog = (exercise: Exercise) => {
    setLogModal(exercise)
    setLogForm({ sets_completed: String(exercise.sets), reps_completed: exercise.reps, weight_used: exercise.weight, note: '' })
    setLogError(null)
  }

  const handleLog = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!logModal) return
    setLogging(true)
    setLogError(null)

    const { error } = await supabase.from('program_logs').insert({
      program_id: program.id,
      athlete_id: athleteId,
      exercise_id: logModal.id,
      sets_completed: logForm.sets_completed ? parseInt(logForm.sets_completed) : null,
      reps_completed: logForm.reps_completed || null,
      weight_used: logForm.weight_used || null,
      note: logForm.note || null,
    })

    if (error) {
      setLogError(error.message)
      setLogging(false)
      return
    }

    setLoggedIds((prev) => { const s = new Set(prev); s.add(logModal.id); return s })
    setLogModal(null)
    setLogging(false)
  }

  return (
    <>
      <div className={`card overflow-hidden ${archived ? 'opacity-70' : ''}`}>
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">{program.title}</h2>
            {program.description && (
              <p className="text-sm text-gray-500 mt-0.5">{program.description}</p>
            )}
          </div>
          {archived && (
            <span className="belt-badge bg-gray-100 text-gray-500">Archived</span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-8 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Exercise</th>
                <th className="w-16 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Sets</th>
                <th className="w-20 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Reps</th>
                <th className="w-24 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Weight</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                {!archived && <th className="w-16 px-3 py-2" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {program.exercises.map((ex, i) => (
                <tr key={ex.id} className={`${loggedIds.has(ex.id) ? 'bg-green-50' : 'hover:bg-gray-50'}`}>
                  <td className="px-3 py-2.5 text-sm text-gray-400">{i + 1}</td>
                  <td className="px-3 py-2.5 text-sm font-medium text-gray-900">{ex.name}</td>
                  <td className="px-3 py-2.5 text-sm text-gray-700">{ex.sets}</td>
                  <td className="px-3 py-2.5 text-sm text-gray-700">{ex.reps || '—'}</td>
                  <td className="px-3 py-2.5 text-sm text-gray-700">{ex.weight || '—'}</td>
                  <td className="px-3 py-2.5 text-sm text-gray-500">{ex.notes || '—'}</td>
                  {!archived && (
                    <td className="px-3 py-2.5 text-center">
                      {loggedIds.has(ex.id) ? (
                        <span className="text-green-600 text-sm">✓</span>
                      ) : (
                        <button
                          onClick={() => openLog(ex)}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded hover:bg-blue-50"
                        >
                          Log
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log modal */}
      {logModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setLogModal(null)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
            <button
              onClick={() => setLogModal(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl"
            >
              ×
            </button>
            <h2 className="font-semibold text-gray-900 mb-1">Log: {logModal.name}</h2>
            <p className="text-xs text-gray-400 mb-4">
              Target: {logModal.sets} sets × {logModal.reps || '—'} @ {logModal.weight || '—'}
            </p>
            <form onSubmit={handleLog} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Sets completed</label>
                  <input
                    type="number"
                    value={logForm.sets_completed}
                    onChange={(e) => setLogForm((p) => ({ ...p, sets_completed: e.target.value }))}
                    className="input"
                    min={0}
                  />
                </div>
                <div>
                  <label className="label">Reps</label>
                  <input
                    value={logForm.reps_completed}
                    onChange={(e) => setLogForm((p) => ({ ...p, reps_completed: e.target.value }))}
                    className="input"
                    placeholder={logModal.reps}
                  />
                </div>
              </div>
              <div>
                <label className="label">Weight used</label>
                <input
                  value={logForm.weight_used}
                  onChange={(e) => setLogForm((p) => ({ ...p, weight_used: e.target.value }))}
                  className="input"
                  placeholder={logModal.weight || 'e.g. 80kg'}
                />
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea
                  value={logForm.note}
                  onChange={(e) => setLogForm((p) => ({ ...p, note: e.target.value }))}
                  className="input"
                  rows={2}
                  placeholder="How did it feel?"
                />
              </div>
              {logError && (
                <p className="text-sm text-red-600">{logError}</p>
              )}
              <button type="submit" disabled={logging} className="btn-primary w-full">
                {logging ? 'Saving…' : 'Save log'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
