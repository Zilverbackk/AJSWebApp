'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { BeltRank, Profile, Role } from '@/lib/types'

const BELT_RANKS: BeltRank[] = ['white', 'yellow', 'orange', 'green', 'blue', 'brown', 'black']

export default function EditMemberForm({ member }: { member: Profile }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)

  const [form, setForm] = useState({
    full_name: member.full_name,
    email: member.email,
    phone: member.phone ?? '',
    role: member.role,
    belt_rank: member.belt_rank ?? ('' as BeltRank | ''),
    date_of_birth: member.date_of_birth ?? '',
    joined_at: member.joined_at ?? '',
    active: member.active,
  })

  const set = (key: string, value: unknown) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSaved(false)

    try {
      let avatar_url = member.avatar_url

      // Upload avatar if selected
      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop()
        const path = `${member.id}/avatar.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(path, avatarFile, { upsert: true })

        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
        avatar_url = urlData.publicUrl
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: form.full_name,
          email: form.email,
          phone: form.phone || null,
          role: form.role,
          belt_rank: form.belt_rank || null,
          date_of_birth: form.date_of_birth || null,
          joined_at: form.joined_at || null,
          active: form.active,
          avatar_url,
        })
        .eq('id', member.id)

      if (updateError) throw updateError

      setSaved(true)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className="label" htmlFor="edit_full_name">Full name *</label>
          <input
            id="edit_full_name"
            required
            value={form.full_name}
            onChange={(e) => set('full_name', e.target.value)}
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="edit_email">Email *</label>
          <input
            id="edit_email"
            type="email"
            required
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="edit_phone">Phone</label>
          <input
            id="edit_phone"
            type="tel"
            value={form.phone}
            onChange={(e) => set('phone', e.target.value)}
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="edit_role">Role</label>
          <select
            id="edit_role"
            value={form.role}
            onChange={(e) => set('role', e.target.value as Role)}
            className="input"
          >
            <option value="athlete">Athlete</option>
            <option value="trainer">Trainer</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="edit_belt">Belt rank</label>
          <select
            id="edit_belt"
            value={form.belt_rank}
            onChange={(e) => set('belt_rank', e.target.value)}
            className="input"
          >
            <option value="">— None —</option>
            {BELT_RANKS.map((b) => (
              <option key={b} value={b}>{b.charAt(0).toUpperCase() + b.slice(1)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="edit_dob">Date of birth</label>
          <input
            id="edit_dob"
            type="date"
            value={form.date_of_birth}
            onChange={(e) => set('date_of_birth', e.target.value)}
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="edit_joined">Joined date</label>
          <input
            id="edit_joined"
            type="date"
            value={form.joined_at}
            onChange={(e) => set('joined_at', e.target.value)}
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="edit_avatar">Profile photo</label>
          <input
            id="edit_avatar"
            type="file"
            accept="image/*"
            onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)}
            className="input text-sm file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          id="edit_active"
          type="checkbox"
          checked={form.active}
          onChange={(e) => set('active', e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-blue-600"
        />
        <label htmlFor="edit_active" className="text-sm text-gray-700">Active member</label>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </p>
      )}
      {saved && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
          Profile saved successfully.
        </p>
      )}

      <button type="submit" disabled={loading} className="btn-primary">
        {loading ? 'Saving…' : 'Save changes'}
      </button>
    </form>
  )
}
