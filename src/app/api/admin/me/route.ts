import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getAdminMeData } from '@/lib/data/admin-me'

/** Current signed-in staff user (admin / educator portal). */
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id || !session.user.canAccessAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await getAdminMeData(session.user.id)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
