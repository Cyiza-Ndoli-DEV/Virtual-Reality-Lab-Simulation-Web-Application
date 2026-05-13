import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { pathname } = req.nextUrl
  const u = req.auth?.user

  if (!req.auth && pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (pathname.startsWith('/admin') && !u?.canAccessAdmin) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (pathname.startsWith('/teacher') && !u?.canAccessTeacher) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (pathname.startsWith('/student') && !u?.canAccessStudent) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return NextResponse.next()
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
