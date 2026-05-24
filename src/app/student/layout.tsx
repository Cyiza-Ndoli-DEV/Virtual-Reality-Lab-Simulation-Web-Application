import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import StudentLayoutClient from './layout-client'

export const dynamic = 'force-dynamic'

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user?.canAccessStudent) {
    redirect('/login')
  }

  return (
    <StudentLayoutClient userName={session.user.name ?? null}>
      {children}
    </StudentLayoutClient>
  )
}
