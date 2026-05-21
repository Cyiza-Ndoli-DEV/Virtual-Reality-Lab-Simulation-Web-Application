import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user.canAccessTeacher) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rows = await prisma.questionnaireSubmission.findMany({
      where: { reviewStatus: 'PENDING' },
      orderBy: { submittedAt: 'desc' },
      include: {
        student: { select: { id: true, name: true, email: true } },
        questionnaire: {
          include: {
            experiment: {
              select: { id: true, title: true, subject: { select: { code: true } } },
            },
          },
        },
      },
    })

    return NextResponse.json(
      rows.map((r) => ({
        id: r.id,
        submittedAt: r.submittedAt.toISOString(),
        reviewStatus: r.reviewStatus,
        student: r.student,
        experiment: {
          id: r.questionnaire.experiment.id,
          title: r.questionnaire.experiment.title,
          subjectCode: r.questionnaire.experiment.subject?.code ?? null,
        },
      }))
    )
  } catch (e) {
    console.error('[GET /api/teacher/submissions]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
