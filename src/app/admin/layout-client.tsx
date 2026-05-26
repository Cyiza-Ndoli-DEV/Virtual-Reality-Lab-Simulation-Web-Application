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
import { clientLogout } from '@/lib/client-logout'
import type { PermissionMap } from '@/lib/portal-permissions'
import {
  portalSubtitle,
  visiblePortalNav,
  visibleSettingsNav,
} from '@/lib/portal-nav'

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
      <AdminAppHeaderProvider
      sessionUser={sessionUser}
      openMobileSidebar={openMobileSidebar}
    >
      <div className="flex h-screen overflow-hidden bg-slate-50">
        <aside
          className={`
        fixed inset-y-0 left-0 z-50 flex h-screen w-64 shrink-0 flex-col overflow-hidden bg-slate-900 transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:static lg:translate-x-0
      `}
        >
          <div className="flex items-center gap-3 border-b border-slate-700 px-6 py-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600">
              <Atom className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">VRSPS</p>
              <p className="text-xs text-slate-400">{portalSubtitle(role)}</p>
            </div>
          </div>

          <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-4">
            <div className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const active =
                  pathname === item.href || pathname.startsWith(`${item.href}/`)
                return (
                  <button
                    key={item.href}
                    type="button"
                    onClick={() => {
                      router.push(item.href)
                      setSidebarOpen(false)
                    }}
                    className={`
                  flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors
                  ${active
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
                `}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                )
              })}
            </div>

            {settingsSubItems.length > 0 ? (
              <div className="mt-4 border-t border-slate-700 pt-4">
                <button
                  type="button"
                  onClick={() => setSettingsOpen((o) => !o)}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-300"
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
                  <div className="mt-1 ml-1.5 space-y-0.5 border-l border-slate-700/80 pl-3">
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
                          className={`
                        flex w-full items-center gap-3 rounded-lg py-2 pr-2 pl-2 text-sm transition-colors
                        ${subActive
                          ? 'bg-slate-800 text-white'
                          : 'text-slate-400 hover:bg-slate-800/80 hover:text-white'}
                      `}
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

          <div className="border-t border-slate-700 px-3 py-4">
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </aside>

        {sidebarOpen ? (
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
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
    </SessionGuard>
  )
}
