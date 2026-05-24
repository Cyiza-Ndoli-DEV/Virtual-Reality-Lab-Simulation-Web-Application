import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getAdminMeData } from '@/lib/data/admin-me'
import AdminLayoutClient from './layout-client'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user?.id || !session.user.canAccessAdmin) {
    redirect('/login')
  }

  const me = await getAdminMeData(session.user.id)
  if (!me) redirect('/login')

  return (
    <AdminLayoutClient
      permissions={me.permissions}
      role={me.role}
      sessionUser={{
        name: me.name,
        email: me.email,
        role: me.role,
        canAccessAdmin: session.user.canAccessAdmin,
        canAccessTeacher: session.user.canAccessTeacher,
        canAccessStudent: session.user.canAccessStudent,
      }}
    >
      {children}
    </AdminLayoutClient>
  )
}
