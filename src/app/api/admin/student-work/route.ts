import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { parseQuestionnaireConfig } from '@/lib/questionnaire'
import { requireStudentWorkAccess } from '@/lib/api-auth'
import { teacherSubjectScopeForSession } from '@/lib/teacher-subject'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    const access = await requireStudentWorkAccess(session)
    if (!access.ok) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: access.status })
    }

    const status = req.nextUrl.searchParams.get('status')
    const teacherSubjectId = await teacherSubjectScopeForSession(session)
    const where = {
      ...(status === 'PENDING'
        ? { reviewStatus: 'PENDING' as const }
        : status === 'COMPLETED'
          ? { reviewStatus: 'COMPLETED' as const }
          : {}),
      ...(teacherSubjectId
        ? {
            questionnaire: {
              experiment: { subjectId: teacherSubjectId },
            },
          }
        : {}),
    }

    const rows = await prisma.questionnaireSubmission.findMany({
      where,
      orderBy: { submittedAt: 'desc' },
      include: {
        student: { select: { id: true, name: true, email: true } },
        questionnaire: {
          select: {
            id: true,
            title: true,
            sections: true,
            experiment: {
              select: {
                id: true,
                title: true,
                subject: { select: { code: true, name: true } },
              },
            },
          },
        },
      },
    })

    return NextResponse.json(
      rows.map((r) => {
        const config = parseQuestionnaireConfig({
          title: r.questionnaire.title,
          sections: r.questionnaire.sections,
        })
        return {
          id: r.id,
          submittedAt: r.submittedAt.toISOString(),
          reviewedAt: r.reviewedAt?.toISOString() ?? null,
          reviewStatus: r.reviewStatus,
          student: r.student,
          experiment: {
            id: r.questionnaire.experiment.id,
            title: r.questionnaire.experiment.title,
            subject: r.questionnaire.experiment.subject,
          },
          questionnaireTitle: config?.title ?? r.questionnaire.title,
          answers: r.answers,
          config,
        }
      })
    )
  } catch (e) {
    console.error('[GET /api/admin/student-work]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
