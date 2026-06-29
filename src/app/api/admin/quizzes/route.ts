import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { serializeQuizListItem } from '@/lib/quiz'
import { teacherSubjectScopeForSession } from '@/lib/teacher-subject'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user.canAccessAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const teacherSubjectId = await teacherSubjectScopeForSession(session)

    const quizzes = await prisma.quiz.findMany({
      where: teacherSubjectId
        ? { experiment: { subjectId: teacherSubjectId } }
        : undefined,
      orderBy: [{ experiment: { title: 'asc' } }, { createdAt: 'desc' }],
      include: {
        experiment: {
          select: {
            id: true,
            title: true,
            subject: { select: { code: true, name: true } },
          },
        },
        _count: { select: { quizQuestions: true } },
      },
    })

    return NextResponse.json(
      quizzes.map((quiz) => ({
        ...serializeQuizListItem(quiz),
        experimentId: quiz.experiment.id,
        experimentTitle: quiz.experiment.title,
        subject: quiz.experiment.subject,
      }))
    )
  } catch (e) {
    console.error('[GET /api/admin/quizzes]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
