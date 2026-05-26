'use client'

import { Bell, Menu } from 'lucide-react'
import Link from 'next/link'
import {
  portalRoleLabel,
  useAdminAppHeader,
} from '@/components/admin/admin-app-header-context'

export function AdminAppHeader() {
  const {
    sessionUser,
    headerUser,
    title,
    hasUnreadNotifications,
    openMobileSidebar,
  } = useAdminAppHeader()

  const user = headerUser ?? sessionUser
  const displayName =
    user?.canAccessAdmin
      ? user?.name || 'System Admin'
      : user?.name || 'Admin User'
  const roleLine = portalRoleLabel(user)
  const avatarSeed = encodeURIComponent(user?.email || user?.name || 'user')

  return (
    <header className="z-[35] shrink-0 border-b border-slate-200/90 bg-white/95 backdrop-blur-md">
      <div className="flex items-center gap-3 px-4 py-3 sm:gap-4 lg:px-6">
        <button
          type="button"
          aria-label="Open navigation menu"
          onClick={openMobileSidebar}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        <h1 className="min-w-0 flex-1 font-serif text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
          {title || 'Admin'}
        </h1>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50"
            aria-label={hasUnreadNotifications ? 'Notifications (unread)' : 'Notifications'}
          >
            <Bell className="h-4 w-4" />
            {hasUnreadNotifications ? (
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
            ) : null}
          </button>

          <Link
            href="/admin/profile"
            className="flex min-w-0 max-w-[min(100%,14rem)] items-center gap-3 rounded-xl border border-slate-200 bg-white py-1.5 pl-1.5 pr-3 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/50 sm:max-w-none"
            aria-label="View your profile"
          >
            <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-slate-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}`}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
            <div className="hidden min-w-0 text-left leading-tight sm:block">
              <p className="truncate font-serif text-sm font-semibold text-slate-900">
                {displayName}
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                {roleLine}
              </p>
            </div>
          </Link>
        </div>
      </div>
    </header>
  )
}
