import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

function noStore(response: NextResponse) {
  response.headers.set(
    'Cache-Control',
    'no-store, no-cache, must-revalidate, private'
  )
  response.headers.set('Pragma', 'no-cache')
  response.headers.set('Expires', '0')
  return response
}

export default auth((req) => {
  const { pathname } = req.nextUrl
  const u = req.auth?.user

  if (!req.auth && pathname !== '/login') {
    return noStore(NextResponse.redirect(new URL('/login', req.url)))
  }

  if (pathname.startsWith('/admin') && !u?.canAccessAdmin) {
    return noStore(NextResponse.redirect(new URL('/login', req.url)))
  }

  if (u?.role === 'TEACHER' && pathname.startsWith('/admin/settings')) {
    return noStore(NextResponse.redirect(new URL('/admin/dashboard', req.url)))
  }

  if (pathname.startsWith('/teacher')) {
    if (!u?.canAccessTeacher && !u?.canAccessAdmin) {
      return noStore(NextResponse.redirect(new URL('/login', req.url)))
    }
    if (u?.canAccessAdmin) {
      return noStore(NextResponse.redirect(new URL('/admin/dashboard', req.url)))
    }
  }

  if (pathname.startsWith('/student') && !u?.canAccessStudent) {
    return noStore(NextResponse.redirect(new URL('/login', req.url)))
  }

  return noStore(NextResponse.next())
})

export const config = {
  matcher: [
    '/',
    '/admin/:path*',
    '/teacher/:path*',
    '/student/:path*',
    '/((?!api|_next/static|_next/image|favicon.ico|login).*)',
  ],
}
