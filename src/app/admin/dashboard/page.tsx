import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getAdminDashboardData } from '@/lib/data/admin-dashboard'
import { getAdminMeData } from '@/lib/data/admin-me'
import { defaultPermissionMapForRoleCode } from '@/lib/app-features'
import { AdminDashboardClient } from './dashboard-client'

export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
  const session = await auth()
  if (!session?.user?.id || !session.user.canAccessAdmin) {
    redirect('/login')
  }

  const [data, me] = await Promise.all([
    getAdminDashboardData(),
    getAdminMeData(session.user.id),
  ])

  const permissions =
    me?.permissions ?? defaultPermissionMapForRoleCode(session.user.role)
  const userName = me?.name ?? session.user.name ?? 'Admin'

  return (
    <AdminDashboardClient
      data={data}
      permissions={permissions}
      userName={userName}
    />
  )
}
