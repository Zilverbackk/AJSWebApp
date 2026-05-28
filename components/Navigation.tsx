'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import type { Role } from '@/lib/types'
import { supabase } from '@/lib/supabase'

interface NavItem {
  label: string
  href: string
  icon: string
}

const adminNav: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: '⌂' },
  { label: 'Members', href: '/admin/members', icon: '👥' },
  { label: 'Calendar', href: '/admin/calendar', icon: '📅' },
  { label: 'Check-in', href: '/admin/checkin', icon: '✅' },
]

const trainerNav: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: '⌂' },
  { label: 'Athletes', href: '/trainer/athletes', icon: '🥋' },
]

const athleteNav: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: '⌂' },
  { label: 'My Profile', href: '/athlete/profile', icon: '👤' },
  { label: 'Check in', href: '/athlete/checkin', icon: '✅' },
  { label: 'Programs', href: '/athlete/programs', icon: '💪' },
]

function getNavItems(role: Role): NavItem[] {
  if (role === 'admin') return adminNav
  if (role === 'trainer') return trainerNav
  return athleteNav
}

interface NavigationProps {
  role: Role
  userName: string
}

export default function Navigation({ role, userName }: NavigationProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const navItems = getNavItems(role)

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  const NavLinks = () => (
    <nav className="flex-1 space-y-1 px-3 py-4">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={() => setMobileOpen(false)}
          className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            isActive(item.href)
              ? 'bg-blue-600 text-white'
              : 'text-gray-300 hover:bg-gray-700 hover:text-white'
          }`}
        >
          <span className="text-base">{item.icon}</span>
          {item.label}
        </Link>
      ))}
    </nav>
  )

  const UserFooter = () => (
    <div className="border-t border-gray-700 p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
          {userName.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-white truncate">{userName}</p>
          <p className="text-xs text-gray-400 capitalize">{role}</p>
        </div>
      </div>
      <button
        onClick={handleSignOut}
        className="w-full text-left text-xs text-gray-400 hover:text-white transition-colors"
      >
        Sign out →
      </button>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-56 lg:flex-col bg-gray-900 min-h-screen flex-shrink-0">
        <div className="flex h-16 items-center px-4 border-b border-gray-700">
          <span className="text-white font-bold text-lg tracking-tight">AJS Judo</span>
        </div>
        <div className="flex flex-1 flex-col overflow-y-auto">
          <NavLinks />
        </div>
        <UserFooter />
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden flex items-center justify-between bg-gray-900 px-4 h-14 flex-shrink-0">
        <span className="text-white font-bold text-base">AJS Judo</span>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-gray-300 hover:text-white p-1"
          aria-label="Toggle menu"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {mobileOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-gray-900 flex flex-col">
            <div className="flex h-14 items-center px-4 border-b border-gray-700">
              <span className="text-white font-bold text-base">AJS Judo</span>
            </div>
            <div className="flex flex-1 flex-col overflow-y-auto">
              <NavLinks />
            </div>
            <UserFooter />
          </div>
        </div>
      )}
    </>
  )
}
