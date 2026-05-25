'use client'

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { portalLabelFromAccessFlags } from '@/lib/role-portal-access'

export type AdminHeaderUser = {
  name?: string | null
  email?: string | null
  role?: string
  canAccessAdmin?: boolean
  canAccessTeacher?: boolean
  canAccessStudent?: boolean
}

type AdminAppHeaderContextValue = {
  sessionUser: AdminHeaderUser | null
  headerUser: AdminHeaderUser | null
  setHeaderUser: (user: AdminHeaderUser | null) => void
  title: string
  setTitle: (t: string) => void
  hasUnreadNotifications: boolean
  setHasUnreadNotifications: (v: boolean) => void
  openMobileSidebar: () => void
}

const AdminAppHeaderContext = createContext<AdminAppHeaderContextValue | null>(null)

export function AdminAppHeaderProvider({
  children,
  sessionUser,
  openMobileSidebar,
}: {
  children: ReactNode
  sessionUser: AdminHeaderUser
  openMobileSidebar: () => void
}) {
  const [headerUser, setHeaderUser] = useState<AdminHeaderUser | null>(null)
  const [title, setTitle] = useState('')
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false)

  const value = useMemo(
    () => ({
      sessionUser,
      headerUser,
      setHeaderUser,
      title,
      setTitle,
      hasUnreadNotifications,
      setHasUnreadNotifications,
      openMobileSidebar,
    }),
    [
      sessionUser,
      headerUser,
      title,
      hasUnreadNotifications,
      openMobileSidebar,
    ]
  )

  return (
    <AdminAppHeaderContext.Provider value={value}>
      {children}
    </AdminAppHeaderContext.Provider>
  )
}

export function useAdminAppHeader() {
  const ctx = useContext(AdminAppHeaderContext)
  if (!ctx) {
    throw new Error('useAdminAppHeader must be used within AdminAppHeaderProvider')
  }
  return ctx
}

export function useAdminPageHeader(
  title: string,
  hasUnreadNotifications = false,
  userOverride?: AdminHeaderUser | null
) {
  const {
    setTitle,
    setHasUnreadNotifications,
    setHeaderUser,
  } = useAdminAppHeader()

  useEffect(() => {
    setTitle(title)
    setHasUnreadNotifications(hasUnreadNotifications)
    if (userOverride !== undefined) {
      setHeaderUser(userOverride)
    }
    return () => {
      setTitle('')
      setHasUnreadNotifications(false)
      if (userOverride !== undefined) {
        setHeaderUser(null)
      }
    }
  }, [
    title,
    hasUnreadNotifications,
    userOverride,
    setTitle,
    setHasUnreadNotifications,
    setHeaderUser,
  ])
}

export function portalRoleLabel(user: AdminHeaderUser | null | undefined) {
  if (!user) return 'USER'
  const flags = {
    canAccessAdmin: !!user.canAccessAdmin,
    canAccessTeacher: !!user.canAccessTeacher,
    canAccessStudent: !!user.canAccessStudent,
  }
  return portalLabelFromAccessFlags(flags, user.role)
}
