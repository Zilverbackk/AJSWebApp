import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  // Refresh session if expired — required for Server Components
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // No session → send to login
  if (!session) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('redirectedFrom', req.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Fetch role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  const role = profile?.role as string | undefined
  const path = req.nextUrl.pathname

  // Routes trainers can access under /admin/*
  const TRAINER_ALLOWED_ADMIN = ['/admin/calendar', '/admin/checkin', '/admin/teams']
  const trainerAllowed = TRAINER_ALLOWED_ADMIN.some((prefix) => path.startsWith(prefix))

  // Enforce role-based access
  if (path.startsWith('/admin')) {
    if (role === 'admin') {
      // full access
    } else if (role === 'trainer' && trainerAllowed) {
      // trainers can access calendar, checkin, teams (read/write enforced in app)
    } else {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  }

  if (path.startsWith('/trainer') && !['admin', 'trainer'].includes(role ?? '')) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // Athletes and trainers can access /athlete/* routes
  // (e.g. a trainer browsing shouldn't land here, but athletes must be logged in)
  if (path.startsWith('/athlete') && !role) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return res
}

export const config = {
  matcher: ['/admin/:path*', '/trainer/:path*', '/athlete/:path*', '/dashboard'],
}
