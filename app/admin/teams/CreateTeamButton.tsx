'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function CreateTeamButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setError(null)

    const { data, error: err } = await supabase
      .from('teams')
      .insert({ name: name.trim(), description: description.trim() || null })
      .select('id')
      .single()

    if (err) {
      setError(err.message)
      setSaving(false)
      return
    }

    setOpen(false)
    setName('')
    setDescription('')
    setSaving(false)
    router.push(`/admin/teams/${data.id}`)
    router.refresh()
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary">
        + New team
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl"
            >
              ×
            </button>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">New team</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="label" htmlFor="team_name">Team name *</label>
                <input
                  id="team_name"
                  required
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input"
                  placeholder="e.g. K3 Elite"
                />
              </div>
              <div>
                <label className="label" htmlFor="team_desc">Description</label>
                <textarea
                  id="team_desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input"
                  rows={2}
                  placeholder="Optional"
                />
              </div>
              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
              )}
              <div className="flex gap-3">
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? 'Creating…' : 'Create team'}
                </button>
                <button type="button" onClick={() => setOpen(false)} className="btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
