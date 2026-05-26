import type { Session } from 'next-auth'

type PortalUser = Session['user'] | undefined

/** Default dashboard after sign-in for this user. */
export function defaultPortalPath(user: PortalUser): string | null {
  if (!user?.id) return null
  if (user.canAccessAdmin) return '/admin/dashboard'
  if (user.canAccessTeacher) return '/admin/student-work'
  if (user.canAccessStudent) return '/student/dashboard'
  return null
}

export function isAuthApiPath(pathname: string): boolean {
  return pathname.startsWith('/api/auth')
}

export function isUnityApiPath(pathname: string): boolean {
  return pathname.startsWith('/api/unity')
}

export function isProtectedApiPath(pathname: string): boolean {
  return (
    pathname.startsWith('/api/admin') ||
    pathname.startsWith('/api/student') ||
    pathname.startsWith('/api/teacher')
  )
}

export function isPublicPagePath(pathname: string): boolean {
  return pathname === '/login'
}

/** Relative in-app path only (blocks open redirects). */
export function safeCallbackUrl(raw: string | null | undefined): string | null {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return null
  if (raw === '/login' || raw.startsWith('/login?')) return null
  return raw
}
