export type Role = 'admin' | 'trainer' | 'athlete'

export type BeltRank =
  | 'white'
  | 'yellow'
  | 'orange'
  | 'green'
  | 'blue'
  | 'brown'
  | 'black'

export type SessionType = 'regular' | 'elite' | 'strength' | 'competition'

export type ProgramStatus = 'active' | 'archived'

export interface Profile {
  id: string
  full_name: string
  email: string
  phone: string | null
  role: Role
  belt_rank: BeltRank | null
  date_of_birth: string | null
  joined_at: string | null
  active: boolean
  avatar_url: string | null
  created_at: string
}

export interface Team {
  id: string
  name: string
  description: string | null
  created_by: string | null
  created_at: string
}

export interface TeamMember {
  id: string
  team_id: string
  profile_id: string
  role: 'athlete' | 'trainer'
  joined_at: string
}

export interface Session {
  id: string
  title: string
  description: string | null
  session_type: SessionType
  starts_at: string
  ends_at: string
  location: string | null
  created_by: string | null
  created_at: string
  recurrence_group_id: string | null
  team_id: string | null
}

export interface CheckIn {
  id: string
  athlete_id: string
  session_id: string | null
  checked_in_at: string
  note: string | null
}

export interface Exercise {
  id: string
  name: string
  sets: number
  reps: string
  weight: string
  notes: string
}

export interface Program {
  id: string
  athlete_id: string
  trainer_id: string
  title: string
  description: string | null
  exercises: Exercise[]
  status: ProgramStatus
  created_at: string
  updated_at: string
}

export interface ProgramLog {
  id: string
  program_id: string
  athlete_id: string
  exercise_id: string
  logged_at: string
  sets_completed: number | null
  reps_completed: string | null
  weight_used: string | null
  note: string | null
}

// Extended types with joins
export interface CheckInWithProfile extends CheckIn {
  profiles: Pick<Profile, 'full_name' | 'belt_rank' | 'avatar_url'>
}

export interface ProgramWithTrainer extends Program {
  trainer: Pick<Profile, 'full_name'>
}
