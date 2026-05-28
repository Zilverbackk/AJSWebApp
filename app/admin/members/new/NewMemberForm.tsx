'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { BeltRank, Role } from '@/lib/types'

const BELT_RANKS: BeltRank[] = ['white', 'yellow', 'orange', 'green', 'blue', 'brown', 'black']

export default function NewMemberForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    role: 'athlete' as Role,
    belt_rank: '' as BeltRank | '',
    date_of_birth: '',
    joined_at: new Date().toISOString().split('T')[0],
    active: true,
    password: '',
  })

  const set = (key: string, value: unknown) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // 1. Create Supabase Auth user via signUp
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { emailRedirectTo: window.location.origin + '/login' },
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('No user returned from auth')

      // 2. Insert profile row
      const { error: profileError } = await supabase.from('profiles').insert({
        id: authData.user.id,
        full_name: form.full_name,
        email: form.email,
        phone: form.phone || null,
        role: form.role,
        belt_rank: form.belt_rank || null,
        date_of_birth: form.date_of_birth || null,
        joined_at: form.joined_at,
        active: form.active,
      })

      if (profileError) throw profileError

      router.push('/admin/members')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className="label" htmlFor="full_name">Full name *</label>
          <input
            id="full_name"
            required
            value={form.full_name}
            onChange={(e) => set('full_name', e.target.value)}
            className="input"
            placeholder="Lars Eriksen"
          />
        </div>
        <div>
          <label className="label" htmlFor="email">Email *</label>
          <input
            id="email"
            type="email"
            required
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
            className="input"
            placeholder="lars@example.com"
          />
        </div>
        <div>
          <label className="label" htmlFor="phone">Phone</label>
          <input
            id="phone"
            type="tel"
            value={form.phone}
            onChange={(e) => set('phone', e.target.value)}
            className="input"
            placeholder="+45 20 12 34 56"
          />
        </div>
        <div>
          <label className="label" htmlFor="password">Temporary password *</label>
          <input
            id="password"
            type="password"
            required
            minLength={6}
            value={form.password}
            onChange={(e) => set('password', e.target.value)}
            className="input"
            placeholder="They can change this after first login"
          />
        </div>
        <div>
          <label className="label" htmlFor="role">Role *</label>
          <select
            id="role"
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
          <label className="label" htmlFor="belt_rank">Belt rank</label>
          <select
            id="belt_rank"
            value={form.belt_rank}
            onChange={(e) => set('belt_rank', e.target.value)}
            className="input"
          >
            <option value="">— Select belt —</option>
            {BELT_RANKS.map((b) => (
              <option key={b} value={b}>{b.charAt(0).toUpperCase() + b.slice(1)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="date_of_birth">Date of birth</label>
          <input
            id="date_of_birth"
            type="date"
            value={form.date_of_birth}
            onChange={(e) => set('date_of_birth', e.target.value)}
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="joined_at">Joined date</label>
          <input
            id="joined_at"
            type="date"
            value={form.joined_at}
            onChange={(e) => set('joined_at', e.target.value)}
            className="input"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          id="active"
          type="checkbox"
          checked={form.active}
          onChange={(e) => set('active', e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-blue-600"
        />
        <label htmlFor="active" className="text-sm text-gray-700">Active member</label>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Creating…' : 'Create member'}
        </button>
        <Link href="/admin/members" className="btn-secondary">
          Cancel
        </Link>
      </div>
    </form>
  )
}
