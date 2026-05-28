'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Exercise } from '@/lib/types'

function newRow(): Exercise {
  return {
    id: crypto.randomUUID(),
    name: '',
    sets: 3,
    reps: '',
    weight: '',
    notes: '',
  }
}

interface Props {
  athleteId: string
  trainerId: string
}

export default function ProgramBuilder({ athleteId, trainerId }: Props) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [exercises, setExercises] = useState<Exercise[]>([newRow()])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const tableRef = useRef<HTMLDivElement>(null)

  const updateExercise = (id: string, field: keyof Exercise, value: string | number) => {
    setExercises((prev) =>
      prev.map((ex) => (ex.id === id ? { ...ex, [field]: value } : ex))
    )
  }

  const addRow = () => {
    setExercises((prev) => [...prev, newRow()])
    // Focus first input of new row after render
    setTimeout(() => {
      const inputs = tableRef.current?.querySelectorAll<HTMLInputElement>('[data-cell]')
      if (inputs && inputs.length > 0) {
        inputs[inputs.length - 5]?.focus()
      }
    }, 50)
  }

  const removeRow = (id: string) => {
    setExercises((prev) => prev.filter((ex) => ex.id !== id))
  }

  // Tab key navigation between cells
  const handleCellKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>, exIdx: number, colIdx: number) => {
      if (e.key === 'Tab') {
        e.preventDefault()
        const COLS = 5 // name, sets, reps, weight, notes
        const nextCol = colIdx + 1
        if (nextCol < COLS) {
          // Move to next column in same row
          const selector = `[data-row="${exIdx}"][data-col="${nextCol}"]`
          const next = tableRef.current?.querySelector<HTMLElement>(selector)
          next?.focus()
        } else {
          // Move to first column of next row (or add new row)
          const nextRow = exIdx + 1
          if (nextRow < exercises.length) {
            const selector = `[data-row="${nextRow}"][data-col="0"]`
            const next = tableRef.current?.querySelector<HTMLElement>(selector)
            next?.focus()
          } else {
            addRow()
          }
        }
      }
    },
    [exercises.length]
  )

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('Program title is required.')
      return
    }
    if (exercises.every((ex) => !ex.name.trim())) {
      setError('Add at least one exercise.')
      return
    }

    setSaving(true)
    setError(null)

    const { error: insertError } = await supabase.from('programs').insert({
      athlete_id: athleteId,
      trainer_id: trainerId,
      title: title.trim(),
      description: description.trim() || null,
      exercises: exercises.filter((ex) => ex.name.trim()),
      status: 'active',
    })

    if (insertError) {
      setError(insertError.message)
      setSaving(false)
      return
    }

    router.push(`/trainer/athletes/${athleteId}`)
    router.refresh()
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Program title + description */}
      <div className="card p-5 space-y-4">
        <div>
          <label className="label" htmlFor="prog_title">
            Program title *
          </label>
          <input
            id="prog_title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input max-w-md"
            placeholder="e.g. Competition prep — Week 1"
          />
        </div>
        <div>
          <label className="label" htmlFor="prog_desc">
            Description (optional)
          </label>
          <textarea
            id="prog_desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input max-w-md"
            rows={2}
            placeholder="Goals, focus areas, notes for the athlete…"
          />
        </div>
      </div>

      {/* Spreadsheet table */}
      <div className="card overflow-hidden" ref={tableRef}>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="w-8 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase min-w-48">Exercise</th>
                <th className="w-20 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Sets</th>
                <th className="w-24 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Reps</th>
                <th className="w-24 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Weight</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase min-w-40">Notes</th>
                <th className="w-10 px-2 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {exercises.map((ex, i) => (
                <tr key={ex.id} className="hover:bg-gray-50 group">
                  <td className="px-3 py-1 text-sm text-gray-400 tabular-nums">{i + 1}</td>
                  <td className="py-1 pl-1">
                    <input
                      data-row={i}
                      data-col={0}
                      data-cell
                      value={ex.name}
                      onChange={(e) => updateExercise(ex.id, 'name', e.target.value)}
                      onKeyDown={(e) => handleCellKeyDown(e, i, 0)}
                      className="cell-input w-full"
                      placeholder="Exercise name"
                    />
                  </td>
                  <td className="py-1 pl-1">
                    <input
                      data-row={i}
                      data-col={1}
                      data-cell
                      type="number"
                      min={1}
                      max={99}
                      value={ex.sets}
                      onChange={(e) => updateExercise(ex.id, 'sets', parseInt(e.target.value) || 0)}
                      onKeyDown={(e) => handleCellKeyDown(e, i, 1)}
                      className="cell-input w-full"
                    />
                  </td>
                  <td className="py-1 pl-1">
                    <input
                      data-row={i}
                      data-col={2}
                      data-cell
                      value={ex.reps}
                      onChange={(e) => updateExercise(ex.id, 'reps', e.target.value)}
                      onKeyDown={(e) => handleCellKeyDown(e, i, 2)}
                      className="cell-input w-full"
                      placeholder="6-8"
                    />
                  </td>
                  <td className="py-1 pl-1">
                    <input
                      data-row={i}
                      data-col={3}
                      data-cell
                      value={ex.weight}
                      onChange={(e) => updateExercise(ex.id, 'weight', e.target.value)}
                      onKeyDown={(e) => handleCellKeyDown(e, i, 3)}
                      className="cell-input w-full"
                      placeholder="80kg"
                    />
                  </td>
                  <td className="py-1 pl-1">
                    <input
                      data-row={i}
                      data-col={4}
                      data-cell
                      value={ex.notes}
                      onChange={(e) => updateExercise(ex.id, 'notes', e.target.value)}
                      onKeyDown={(e) => handleCellKeyDown(e, i, 4)}
                      className="cell-input w-full"
                      placeholder="Notes…"
                    />
                  </td>
                  <td className="px-2 py-1 text-center">
                    <button
                      type="button"
                      onClick={() => removeRow(ex.id)}
                      disabled={exercises.length === 1}
                      className="text-gray-300 hover:text-red-500 transition-colors disabled:invisible"
                      aria-label="Remove exercise"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add row */}
        <div className="border-t border-gray-100 p-2">
          <button
            type="button"
            onClick={addRow}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium px-3 py-1.5 rounded hover:bg-blue-50 transition-colors"
          >
            + Add exercise
          </button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Saving…' : 'Save program'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="btn-secondary"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
