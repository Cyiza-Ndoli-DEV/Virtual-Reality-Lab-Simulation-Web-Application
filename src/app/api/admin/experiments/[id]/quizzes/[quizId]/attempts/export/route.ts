import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { assertQuizAccessible } from '@/lib/quiz-access'

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string; quizId: string }> }
) {
  try {
    const session = await auth()
    const { quizId } = await ctx.params
    const access = await assertQuizAccessible(session, quizId)
    if (!access.ok) {
      return NextResponse.json({ error: 'Not found' }, { status: access.status })
    }

    const [quiz, attempts] = await Promise.all([
      prisma.quiz.findUnique({
        where: { id: quizId },
        select: { title: true, passMark: true },
      }),
      prisma.quizAttempt.findMany({
        where: { quizId },
        orderBy: { attemptedAt: 'desc' },
        include: { student: { select: { name: true, email: true } } },
      }),
    ])

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })
    }

    const header = 'Student Name,Email,Score,Total Points,Percentage,Pass/Fail,Submitted At'
    const lines = attempts.map((a) => {
      const cols = [
        `"${a.student.name.replace(/"/g, '""')}"`,
        `"${a.student.email.replace(/"/g, '""')}"`,
        String(a.score),
        String(a.totalPoints),
        String(a.percentage),
        a.passed ? 'Pass' : 'Fail',
        a.attemptedAt.toISOString(),
      ]
      return cols.join(',')
    })

    const csv = [header, ...lines].join('\n')
    const filename = `${quiz.title.replace(/[^a-z0-9-_]+/gi, '-').toLowerCase()}-results.csv`

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (e) {
    console.error('[GET .../attempts/export]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
