'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { Atom, LogOut, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [userName, setUserName] = useState<string | null>(null)

  const loadMe = useCallback(async () => {
    const res = await fetch('/api/student/me')
    if (!res.ok) return
    const data = await res.json()
    if (typeof data.name === 'string') setUserName(data.name)
  }, [])

  useEffect(() => {
    queueMicrotask(() => {
      void loadMe()
    })
  }, [loadMe, pathname])

  async function handleLogout() {
    await signOut({ redirect: false })
    router.push('/login')
  }

  const onMyLabs =
    pathname === '/student/dashboard' || pathname.startsWith('/student/experiments')
  const onProfile = pathname === '/student/profile'

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <Link href="/student/dashboard" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
              <Atom className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold tracking-tight text-slate-900">VRSPS</p>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                Student Portal
              </p>
            </div>
          </Link>

          <nav className="flex items-center gap-1 sm:gap-4">
            <Link
              href="/student/dashboard"
              className={cn(
                'px-2 py-2 text-sm font-medium transition-colors sm:px-3',
                onMyLabs
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              My labs
            </Link>
            <Link
              href="/student/profile"
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-2 py-2 text-sm font-medium transition-colors sm:px-3',
                onProfile
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-slate-600 hover:text-slate-900'
              )}
              aria-label={userName ? `Profile: ${userName}` : 'Profile'}
              title={userName ?? 'Profile'}
            >
              <User className="h-5 w-5" />
              <span className="hidden sm:inline">Profile</span>
            </Link>
            <Button
              type="button"
              variant="ghost"
              className="text-slate-500 hover:text-slate-800"
              onClick={() => void handleLogout()}
            >
              <LogOut className="mr-1.5 h-4 w-4 sm:inline" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1 px-6 py-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>

      <footer className="mt-auto border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-bold text-slate-900">VRSPS</p>
            <p className="mt-2 max-w-sm text-xs leading-relaxed text-slate-500">
              © {new Date().getFullYear()} Virtual Reality Science Practical System. For
              academic use only.
            </p>
          </div>
          <div className="flex flex-col gap-4 text-xs text-slate-500 sm:items-end">
            <div className="flex flex-wrap gap-x-6 gap-y-2 sm:justify-end">
              <span className="cursor-default hover:text-slate-700">Privacy Policy</span>
              <span className="cursor-default hover:text-slate-700">Terms of Service</span>
              <span className="cursor-default hover:text-slate-700">Help Center</span>
            </div>
            <span className="cursor-default hover:text-slate-700 sm:text-right">Support</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
