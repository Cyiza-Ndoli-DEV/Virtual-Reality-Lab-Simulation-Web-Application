import type { LucideIcon } from 'lucide-react'
import {
  BookMarked,
  ClipboardList,
  FileText,
  FlaskConical,
  GraduationCap,
  LayoutDashboard,
  Shield,
  User,
  Users,
} from 'lucide-react'
import type { AppFeatureKey } from './app-features'
import type { PermissionMap } from './portal-permissions'
import { hasPermission } from './portal-permissions'

export type PortalNavItem = {
  label: string
  href: string
  icon: LucideIcon
  feature: AppFeatureKey
}

export const portalNavItems: PortalNavItem[] = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard, feature: 'admin.portal' },
  { label: 'User Management', href: '/admin/users', icon: Users, feature: 'admin.users' },
  {
    label: 'Students',
    href: '/admin/students',
    icon: GraduationCap,
    feature: 'teacher.registerStudents',
  },
  { label: 'Experiments', href: '/admin/experiments', icon: FlaskConical, feature: 'admin.experiments' },
  { label: 'Student work', href: '/admin/student-work', icon: ClipboardList, feature: 'teacher.reports' },
  { label: 'Reports', href: '/admin/reports', icon: FileText, feature: 'admin.reports' },
]

export type PortalSettingsItem = {
  label: string
  href: string
  icon: LucideIcon
  feature: AppFeatureKey
  /** Roles management is admin-only (uses admin.users). */
  adminOnly?: boolean
}

export const portalSettingsItems: PortalSettingsItem[] = [
  { label: 'Account', href: '/admin/profile', icon: User, feature: 'admin.portal' },
  { label: 'Roles', href: '/admin/settings/roles', icon: Shield, feature: 'admin.settings', adminOnly: true },
  { label: 'Subjects', href: '/admin/settings/subjects', icon: BookMarked, feature: 'admin.settings' },
]

export function visiblePortalNav(permissions: PermissionMap) {
  return portalNavItems.filter((item) => {
    if (!hasPermission(permissions, item.feature)) return false
    // Full admins use Users; educators use Students only.
    if (
      item.feature === 'teacher.registerStudents' &&
      hasPermission(permissions, 'admin.users')
    ) {
      return false
    }
    return true
  })
}

export function visibleSettingsNav(
  permissions: PermissionMap,
  roleCode?: string
) {
  if (roleCode === 'TEACHER') return []
  return portalSettingsItems.filter((item) => {
    if (!hasPermission(permissions, item.feature)) return false
    if (item.adminOnly) return hasPermission(permissions, 'admin.users')
    return true
  })
}

export function portalSubtitle(role: string): string {
  return role === 'TEACHER' ? 'Educator Portal' : 'Admin Portal'
}
