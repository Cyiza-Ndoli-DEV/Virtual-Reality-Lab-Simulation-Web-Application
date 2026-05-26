import { auth } from '@/lib/auth'
import { defaultPortalPath } from '@/lib/portal-routes'
import { redirect } from 'next/navigation'

export default async function Home() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/login')
  }

  const portal = defaultPortalPath(session.user)
  redirect(portal ?? '/login')
}
