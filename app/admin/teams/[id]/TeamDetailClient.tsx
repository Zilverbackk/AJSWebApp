'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getBeltColor } from '@/lib/belt-colors'
import type { Team, TeamMember, Profile, BeltRank } from '@/lib/types'

interface MemberWithProfile extends TeamMember {
  profiles: Pick<Profile, 'id' | 'full_name' | 'email' | 'belt_rank' | 'avatar_url'>
}

interface Props {
  team: Team
  athletes: MemberWithProfile[]
  trainers: MemberWithProfile[]
  isAdmin: boolean
}

export default function TeamDetailClient({ team, athletes, trainers, isAdmin }: Props) {
  const router = useRouter()

  // Team info edit
  const [editName, setEditName] = useState(team.name)
  const [editDesc, setEditDesc] = useState(team.description ?? '')
  const [savingInfo, setSavingInfo] = useState(false)
  const [infoSaved, setInfoSaved] = useState(false)
  const [infoError, setInfoError] = useState<string | null>(null)

  // Member picker state
  const [athleteSearch, setAthleteSearch] = useState('')
  const [trainerSearch, setTrainerSearch] = useState('')
  const [athleteResults, setAthleteResults] = useState<Pick<Profile, 'id' | 'full_name' | 'email' | 'belt_rank'>[]>([])
  const [trainerResults, setTrainerResults] = useState<Pick<Profile, 'id' | 'full_name' | 'email' | 'belt_rank'>[]>([])
  const [addingId, setAddingId] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)

  // Delete team
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // ── Save team info ──────────────────────────────────────────────────────────

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editName.trim()) return
    setSavingInfo(true)
    setInfoError(null)

    const { error } = await supabase
      .from('teams')
      .update({ name: editName.trim(), description: editDesc.trim() || null })
      .eq('id', team.id)

    if (error) { setInfoError(error.message) } else { setInfoSaved(true); setTimeout(() => setInfoSaved(false), 2000) }
    setSavingInfo(false)
    router.refresh()
  }

  // ── Member search ───────────────────────────────────────────────────────────

  const existingIds = new Set([...athletes, ...trainers].map((m) => m.profile_id))

  const searchMembers = useCallback(async (q: string, role: 'athlete' | 'trainer') => {
    if (!q.trim()) {
      if (role === 'athlete') setAthleteResults([])
      else setTrainerResults([])
      return
    }

    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email, belt_rank')
      .eq('role', role)
      .eq('active', true)
      .or(`full_name.ilike.%${q}%,email.ilike.%${q}%`)
      .limit(8)

    const filtered = (data ?? []).filter((p: Pick<Profile, 'id'>) => !existingIds.has(p.id))
    if (role === 'athlete') setAthleteResults(filtered)
    else setTrainerResults(filtered)
  }, [existingIds])

  const handleAthleteSearch = (q: string) => {
    setAthleteSearch(q)
    searchMembers(q, 'athlete')
  }

  const handleTrainerSearch = (q: string) => {
    setTrainerSearch(q)
    searchMembers(q, 'trainer')
  }

  // ── Add member ──────────────────────────────────────────────────────────────

  const addMember = async (profileId: string, role: 'athlete' | 'trainer') => {
    setAddingId(profileId)
    const { error } = await supabase.from('team_members').insert({
      team_id: team.id,
      profile_id: profileId,
      role,
    })
    if (!error) {
      if (role === 'athlete') { setAthleteSearch(''); setAthleteResults([]) }
      else { setTrainerSearch(''); setTrainerResults([]) }
      router.refresh()
    }
    setAddingId(null)
  }

  // ── Remove member ───────────────────────────────────────────────────────────

  const removeMember = async (memberId: string) => {
    setRemovingId(memberId)
    await supabase.from('team_members').delete().eq('id', memberId)
    router.refresh()
    setRemovingId(null)
  }

  // ── Delete team ─────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    setDeleting(true)
    await supabase.from('teams').delete().eq('id', team.id)
    router.push('/admin/teams')
    router.refresh()
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Team info */}
      <div className="card p-5">
        {isAdmin ? (
          <form onSubmit={handleSaveInfo} className="space-y-4">
            <h2 className="font-semibold text-gray-900 mb-1">Team details</h2>
            <div>
              <label className="label" htmlFor="t_name">Name *</label>
              <input
                id="t_name"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="input max-w-sm"
              />
            </div>
            <div>
              <label className="label" htmlFor="t_desc">Description</label>
              <textarea
                id="t_desc"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                className="input max-w-sm"
                rows={2}
              />
            </div>
            {infoError && <p className="text-sm text-red-600">{infoError}</p>}
            <button type="submit" disabled={savingInfo} className="btn-primary text-sm">
              {savingInfo ? 'Saving…' : infoSaved ? 'Saved ✓' : 'Save details'}
            </button>
          </form>
        ) : (
          <div>
            <h1 className="text-xl font-bold text-gray-900">{team.name}</h1>
            {team.description && <p className="text-sm text-gray-500 mt-1">{team.description}</p>}
          </div>
        )}
      </div>

      {/* Trainers */}
      <MemberSection
        title="Trainers"
        role="trainer"
        members={trainers}
        isAdmin={isAdmin}
        searchValue={trainerSearch}
        searchResults={trainerResults}
        onSearch={handleTrainerSearch}
        onAdd={(id) => addMember(id, 'trainer')}
        onRemove={removeMember}
        addingId={addingId}
        removingId={removingId}
        emptyLabel="No trainers assigned"
      />

      {/* Athletes */}
      <MemberSection
        title="Athletes"
        role="athlete"
        members={athletes}
        isAdmin={isAdmin}
        searchValue={athleteSearch}
        searchResults={athleteResults}
        onSearch={handleAthleteSearch}
        onAdd={(id) => addMember(id, 'athlete')}
        onRemove={removeMember}
        addingId={addingId}
        removingId={removingId}
        emptyLabel="No athletes in this team"
      />

      {/* Danger zone */}
      {isAdmin && (
        <div className="card p-5 border-red-100">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Danger zone</h3>
          {!showDelete ? (
            <button
              onClick={() => setShowDelete(true)}
              className="text-sm text-red-600 border border-red-200 rounded-md px-3 py-1.5 hover:bg-red-50 transition-colors"
            >
              Delete team
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                This will permanently delete the team and remove all member assignments. Sessions tagged to this team will become untagged. <strong>Cannot be undone.</strong>
              </p>
              <div className="flex gap-3">
                <button onClick={handleDelete} disabled={deleting} className="btn-danger text-sm">
                  {deleting ? 'Deleting…' : `Delete "${editName}"`}
                </button>
                <button onClick={() => setShowDelete(false)} className="btn-secondary text-sm">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── MemberSection sub-component ───────────────────────────────────────────────

interface MemberSectionProps {
  title: string
  role: 'athlete' | 'trainer'
  members: (TeamMember & { profiles: Pick<Profile, 'id' | 'full_name' | 'email' | 'belt_rank' | 'avatar_url'> })[]
  isAdmin: boolean
  searchValue: string
  searchResults: Pick<Profile, 'id' | 'full_name' | 'email' | 'belt_rank'>[]
  onSearch: (q: string) => void
  onAdd: (id: string) => void
  onRemove: (memberId: string) => void
  addingId: string | null
  removingId: string | null
  emptyLabel: string
}

function MemberSection({
  title, members, isAdmin,
  searchValue, searchResults,
  onSearch, onAdd, onRemove,
  addingId, removingId, emptyLabel,
}: MemberSectionProps) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-900">
          {title} <span className="text-gray-400 font-normal text-sm">({members.length})</span>
        </h2>
      </div>

      {/* Member list */}
      {members.length === 0 ? (
        <p className="text-sm text-gray-400 mb-4">{emptyLabel}.</p>
      ) : (
        <ul className="space-y-2 mb-4">
          {members.map((m) => {
            const p = m.profiles
            const initials = p.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
            return (
              <li key={m.id} className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{p.full_name}</p>
                  <p className="text-xs text-gray-400 truncate">{p.email}</p>
                </div>
                {p.belt_rank && (
                  <span className={`belt-badge text-xs flex-shrink-0 ${getBeltColor(p.belt_rank as BeltRank)}`}>
                    {p.belt_rank}
                  </span>
                )}
                {isAdmin && (
                  <button
                    onClick={() => onRemove(m.id)}
                    disabled={removingId === m.id}
                    className="text-xs text-gray-400 hover:text-red-500 transition-colors flex-shrink-0 px-1"
                    title="Remove from team"
                  >
                    {removingId === m.id ? '…' : '×'}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {/* Search + add (admin only) */}
      {isAdmin && (
        <div className="relative">
          <input
            type="search"
            value={searchValue}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={`Search to add ${title.toLowerCase()}…`}
            className="input text-sm"
          />
          {searchResults.length > 0 && (
            <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
              {searchResults.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => onAdd(p.id)}
                    disabled={addingId === p.id}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-blue-50 text-left transition-colors"
                  >
                    <div className="h-7 w-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                      {p.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{p.full_name}</p>
                      <p className="text-xs text-gray-400 truncate">{p.email}</p>
                    </div>
                    {p.belt_rank && (
                      <span className={`belt-badge text-xs ${getBeltColor(p.belt_rank as BeltRank)}`}>
                        {p.belt_rank}
                      </span>
                    )}
                    <span className="text-xs text-blue-600 flex-shrink-0">
                      {addingId === p.id ? 'Adding…' : '+ Add'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
