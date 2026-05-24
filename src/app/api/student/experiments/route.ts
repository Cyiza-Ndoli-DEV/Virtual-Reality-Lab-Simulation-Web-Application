import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getStudentExperiments } from '@/lib/data/student-experiments'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user.canAccessStudent) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(
      await getStudentExperiments(session.user.id)
    )
  } catch (e) {
    console.error('[GET /api/student/experiments]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
