import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user.canAccessTeacher) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await ctx.params
    const body = await req.json()

    if (body.reviewStatus !== 'COMPLETED') {
      return NextResponse.json(
        { error: 'Only reviewStatus COMPLETED is supported' },
        { status: 400 }
      )
    }

    const existing = await prisma.questionnaireSubmission.findUnique({
      where: { id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    const updated = await prisma.questionnaireSubmission.update({
      where: { id },
      data: {
        reviewStatus: 'COMPLETED',
        reviewedAt: new Date(),
        reviewedById: session.user.id,
      },
    })

    return NextResponse.json({
      id: updated.id,
      reviewStatus: updated.reviewStatus,
      reviewedAt: updated.reviewedAt?.toISOString() ?? null,
    })
  } catch (e) {
    console.error('[PATCH /api/teacher/submissions/:id]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
