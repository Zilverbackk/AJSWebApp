import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import type { Profile } from './types'

/**
 * Server-side Supabase client. Use inside Server Components and Route Handlers.
 * Do NOT use in Client Components — import from lib/supabase.ts instead.
 */
export function createServerClient() {
  return createServerComponentClient({ cookies })
}

/**
 * Get the current authenticated user's profile from the database.
 * Returns null if unauthenticated or profile not found.
 */
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) return null

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single()

  return data as Profile | null
}
