'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Atom, ChevronDown, ChevronRight, LogOut, Settings } from 'lucide-react'
import { AdminAppHeader } from '@/components/admin/admin-app-header'
import {
  AdminAppHeaderProvider,
  type AdminHeaderUser,
} from '@/components/admin/admin-app-header-context'
import { SessionGuard } from '@/components/session-guard'
import { ChangePasswordProvider } from '@/components/account/change-password-provider'
import { clientLogout } from '@/lib/client-logout'
import type { PermissionMap } from '@/lib/portal-permissions'
import {
  portalSubtitle,
  isPortalNavItemActive,
  visiblePortalNav,
  visibleSettingsNav,
} from '@/lib/portal-nav'
import { cn } from '@/lib/utils'

export default function AdminLayoutClient({
  children,
  permissions,
  role,
  sessionUser,
}: {
  children: React.ReactNode
  permissions: PermissionMap
  role: string
  sessionUser: AdminHeaderUser
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(() =>
    pathname.startsWith('/admin/settings') || pathname.startsWith('/admin/profile')
  )

  useEffect(() => {
    if (pathname.startsWith('/admin/settings') || pathname.startsWith('/admin/profile')) {
      queueMicrotask(() => setSettingsOpen(true))
    }
  }, [pathname])

  async function handleLogout() {
    await clientLogout()
  }

  const openMobileSidebar = useCallback(() => setSidebarOpen(true), [])

  const navItems = visiblePortalNav(permissions)
  const settingsSubItems = visibleSettingsNav(permissions, role)

  return (
    <SessionGuard require="admin">
      <ChangePasswordProvider portalHome="/admin/dashboard">
      <AdminAppHeaderProvider
      sessionUser={sessionUser}
      openMobileSidebar={openMobileSidebar}
    >
      <div className="flex h-screen overflow-hidden bg-gradient-to-br from-sky-50 via-white to-cyan-50">
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-50 flex h-screen w-64 shrink-0 flex-col overflow-hidden bg-gradient-to-b from-blue-600 to-cyan-500 shadow-xl transition-transform duration-200',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
            'lg:static'
          )}
        >
          <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-16 -left-8 h-32 w-32 rounded-full bg-white/10" />

          <div className="relative flex items-center gap-3 border-b border-white/15 px-6 py-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 shadow-sm backdrop-blur-sm">
              <Atom className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-base font-semibold text-white">VRSPS</p>
              <p className="app-caption text-blue-100">{portalSubtitle(role)}</p>
            </div>
          </div>

          <nav className="relative flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-4">
            <div className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const active = isPortalNavItemActive(item, pathname)
                return (
                  <button
                    key={item.href}
                    type="button"
                    onClick={() => {
                      router.push(item.href)
                      setSidebarOpen(false)
                    }}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[0.9375rem] font-medium transition-colors',
                      active
                        ? 'bg-white text-blue-700 shadow-sm'
                        : 'text-blue-50 hover:bg-white/15 hover:text-white'
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </button>
                )
              })}
            </div>

            {settingsSubItems.length > 0 ? (
              <div className="mt-4 border-t border-white/15 pt-4">
                <button
                  type="button"
                  onClick={() => setSettingsOpen((o) => !o)}
                  className="app-label flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-blue-100 transition-colors hover:bg-white/10 hover:text-white"
                  aria-expanded={settingsOpen}
                >
                  {settingsOpen ? (
                    <ChevronDown className="h-4 w-4 shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0" />
                  )}
                  <Settings className="h-4 w-4 shrink-0" />
                  Settings
                </button>
                {settingsOpen ? (
                  <div className="mt-1 ml-1.5 space-y-0.5 border-l border-white/20 pl-3">
                    {settingsSubItems.map((sub) => {
                      const SubIcon = sub.icon
                      const subActive = pathname === sub.href
                      return (
                        <button
                          key={sub.href}
                          type="button"
                          onClick={() => {
                            router.push(sub.href)
                            setSidebarOpen(false)
                          }}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-lg py-2 pr-2 pl-2 text-[0.9375rem] transition-colors',
                            subActive
                              ? 'bg-white/20 font-medium text-white'
                              : 'text-blue-100 hover:bg-white/10 hover:text-white'
                          )}
                        >
                          <SubIcon className="h-4 w-4 shrink-0 opacity-90" />
                          {sub.label}
                        </button>
                      )
                    })}
                  </div>
                ) : null}
              </div>
            ) : null}
          </nav>

          <div className="relative border-t border-white/15 px-3 py-4">
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[0.9375rem] text-blue-50 transition-colors hover:bg-white/15 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </aside>

        {sidebarOpen ? (
          <div
            className="fixed inset-0 z-40 bg-blue-950/40 backdrop-blur-[2px] lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden
          />
        ) : null}

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <AdminAppHeader />
          <main className="min-h-0 flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </AdminAppHeaderProvider>
      </ChangePasswordProvider>
    </SessionGuard>
  )
}
