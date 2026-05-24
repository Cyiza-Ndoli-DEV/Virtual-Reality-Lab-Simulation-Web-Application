import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getAdminStats } from '@/lib/data/admin-stats'

export async function GET() {
  try {
    const session = await auth()
    if (!session || !session.user.canAccessAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(await getAdminStats())
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
