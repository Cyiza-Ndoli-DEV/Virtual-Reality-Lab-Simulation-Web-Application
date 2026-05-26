import { auth } from '@/lib/auth'
import {
  defaultPortalPath,
  isAuthApiPath,
  isProtectedApiPath,
  isPublicPagePath,
  isUnityApiPath,
} from '@/lib/portal-routes'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { pathname } = req.nextUrl
  const user = req.auth?.user
  const isLoggedIn = Boolean(req.auth?.user?.id)

  if (isAuthApiPath(pathname) || isUnityApiPath(pathname)) {
    const requestHeaders = new Headers(req.headers)
    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  if (isProtectedApiPath(pathname)) {
    if (!isLoggedIn) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.next()
  }

  if (isLoggedIn) {
    const home = defaultPortalPath(user)
    if (pathname === '/login' || pathname === '/') {
      return NextResponse.redirect(new URL(home ?? '/login', req.url))
    }
  } else if (!isPublicPagePath(pathname)) {
    const loginUrl = new URL('/login', req.url)
    if (pathname !== '/') {
      loginUrl.searchParams.set('callbackUrl', pathname)
    }
    return NextResponse.redirect(loginUrl)
  }

  if (pathname.startsWith('/admin') && !user?.canAccessAdmin) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (user?.role === 'TEACHER' && pathname.startsWith('/admin/settings')) {
    return NextResponse.redirect(new URL('/admin/dashboard', req.url))
  }

  if (pathname.startsWith('/teacher')) {
    if (!user?.canAccessTeacher && !user?.canAccessAdmin) {
      return NextResponse.redirect(new URL('/login', req.url))
    }
    if (user?.canAccessAdmin) {
      return NextResponse.redirect(new URL('/admin/dashboard', req.url))
    }
  }

  if (pathname.startsWith('/student') && !user?.canAccessStudent) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
