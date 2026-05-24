import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { parseQuestionnaireConfig } from '@/lib/questionnaire'
import { requireStudentWorkAccess } from '@/lib/api-auth'
import { teacherSubjectScopeForSession } from '@/lib/teacher-subject'

const DEFAULT_PAGE_SIZE = 25
const MAX_PAGE_SIZE = 100

function buildWhere(
  status: string | null,
  teacherSubjectId: string | null
) {
  return {
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
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    const access = await requireStudentWorkAccess(session)
    if (!access.ok) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: access.status })
    }

    const params = req.nextUrl.searchParams
    const status = params.get('status')
    const teacherSubjectId = await teacherSubjectScopeForSession(session)
    const where = buildWhere(status, teacherSubjectId)

    const page = Math.max(1, parseInt(params.get('page') ?? '1', 10) || 1)
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(params.get('pageSize') ?? String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE)
    )
    const skip = (page - 1) * pageSize

    const [rows, total] = await Promise.all([
      prisma.questionnaireSubmission.findMany({
        where,
        orderBy: { submittedAt: 'desc' },
        skip,
        take: pageSize,
        select: {
          id: true,
          submittedAt: true,
          reviewedAt: true,
          reviewStatus: true,
          student: { select: { id: true, name: true, email: true } },
          questionnaire: {
            select: {
              title: true,
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
      }),
      prisma.questionnaireSubmission.count({ where }),
    ])

    return NextResponse.json({
      items: rows.map((r) => ({
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
        questionnaireTitle: r.questionnaire.title,
      })),
      total,
      page,
      pageSize,
    })
  } catch (e) {
    console.error('[GET /api/admin/student-work]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
