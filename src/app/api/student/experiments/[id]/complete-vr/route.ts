import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { completeVirtualPracticalForStudent } from '@/lib/complete-vr-session'

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user.canAccessStudent) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: experimentId } = await ctx.params
    const result = await completeVirtualPracticalForStudent(
      session.user.id,
      experimentId
    )

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      )
    }

    return NextResponse.json({
      sessionId: result.sessionId,
      alreadyCompleted: result.alreadyCompleted,
    })
  } catch (e) {
    console.error('[POST /api/student/experiments/:id/complete-vr]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
