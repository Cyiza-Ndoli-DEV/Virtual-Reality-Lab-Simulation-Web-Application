'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAdminPageHeader } from '@/components/admin/admin-app-header-context'
import type { QuizAttemptDetailDto, QuizAttemptListItem, QuizStatsDto } from '@/lib/quiz'
import type { FinalGradeBreakdown } from '@/lib/experiment-grading'
import { GradeBreakdown } from '@/components/grading/grade-breakdown'
import { letterGradeFromPercent } from '@/lib/letter-grades'

type QuizAttemptDetail = QuizAttemptDetailDto & {
  marksAwarded: number | null
  marksMax: number
  suggestedMarks: number
  gradeBreakdown: FinalGradeBreakdown | null
}

export default function AdminQuizResultsPage() {
  const params = useParams()
  const router = useRouter()
  const experimentId = typeof params.id === 'string' ? params.id : ''
  const quizId = typeof params.quizId === 'string' ? params.quizId : ''

  const [quizTitle, setQuizTitle] = useState('')
  const [stats, setStats] = useState<QuizStatsDto | null>(null)
  const [attempts, setAttempts] = useState<QuizAttemptListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState<QuizAttemptDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useAdminPageHeader('Quiz results', false)

  const load = useCallback(async () => {
    if (!experimentId || !quizId) return
    setLoading(true)
    try {
      const res = await fetch(
        `/api/admin/experiments/${experimentId}/quizzes/${quizId}/results`
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return
      setQuizTitle(data.quiz?.title ?? '')
      setStats(data.stats ?? null)
      setAttempts(Array.isArray(data.attempts) ? data.attempts : [])
    } finally {
      setLoading(false)
    }
  }, [experimentId, quizId])

  useEffect(() => {
    queueMicrotask(() => {
      void load()
    })
  }, [load])

  async function viewAttempt(attemptId: string) {
    setDetailLoading(true)
    try {
      const res = await fetch(
        `/api/admin/experiments/${experimentId}/quizzes/${quizId}/attempts/${attemptId}`
      )
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setDetail(data as QuizAttemptDetail)
      }
    } finally {
      setDetailLoading(false)
    }
  }

  function exportCsv() {
    window.location.href = `/api/admin/experiments/${experimentId}/quizzes/${quizId}/attempts/export`
  }

  const statCards = stats
    ? [
        { label: 'Total attempts', value: stats.totalAttempts },
        { label: 'Average score', value: `${stats.averageScore}%` },
        { label: 'Highest', value: `${stats.highestScore}%` },
        { label: 'Lowest', value: `${stats.lowestScore}%` },
        { label: 'Pass rate', value: `${stats.passRate}%` },
      ]
    : []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          type="button"
          variant="ghost"
          className="gap-2 text-slate-600"
          onClick={() => router.push(`/admin/experiments/${experimentId}/quizzes/${quizId}`)}
        >
          <ArrowLeft className="size-4" />
          Back to quiz
        </Button>
        <Button variant="outline" className="gap-2" onClick={exportCsv}>
          <Download className="size-4" />
          Export CSV
        </Button>
      </div>

      <div>
        <h2 className="app-section-title">{quizTitle || 'Quiz results'}</h2>
        <p className="text-sm text-slate-500">Student attempt analytics</p>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading results…</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {statCards.map((s) => (
              <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{s.label}</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{s.value}</p>
              </div>
            ))}
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Percentage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attempts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-slate-500">
                      No attempts yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  attempts.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.studentName}</TableCell>
                      <TableCell>
                        {a.score}/{a.totalPoints}
                      </TableCell>
                      <TableCell>{a.percentage}%</TableCell>
                      <TableCell>
                        {a.passed ? (
                          <Badge className="border-emerald-200/80 bg-emerald-50 text-emerald-800">Pass</Badge>
                        ) : (
                          <Badge className="border-red-200/80 bg-red-50 text-red-800">Fail</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">
                        {new Date(a.attemptedAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => void viewAttempt(a.id)}>
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      <Dialog open={Boolean(detail)} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-h-[85vh] w-full max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-3xl sm:p-6">
          <DialogHeader>
            <DialogTitle>
              {detail?.studentName ?? 'Attempt'} — {detail?.percentage}%
            </DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : detail ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                <p className="font-medium text-slate-800">Quiz marks (auto-scored)</p>
                <p className="mt-1 text-slate-600">
                  {detail.suggestedMarks} / {detail.marksMax} from {detail.percentage}%
                  score
                  {detail.marksAwarded !== null ? (
                    <span className="text-slate-500"> · recorded at submission</span>
                  ) : null}
                </p>
              </div>
              {detail.gradeBreakdown ? (
                <GradeBreakdown
                  breakdown={detail.gradeBreakdown}
                  title={
                    detail.gradeBreakdown.isComplete
                      ? `Final grade: ${
                          letterGradeFromPercent(detail.gradeBreakdown.percentage ?? 0)
                            ?.letter ?? '—'
                        }`
                      : 'Grade progress (awaiting report marks)'
                  }
                />
              ) : null}
              <ul className="space-y-3">
                {detail.answers.map((a, i) => (
                  <li key={a.questionId} className="rounded-lg border border-slate-200 p-3 text-sm">
                    <p className="font-medium text-slate-900">
                      {i + 1}. {a.questionText}
                    </p>
                    <p className="mt-1 text-slate-600">
                      Answer: {a.selectedOptionText ?? '—'}
                    </p>
                    {!a.isCorrect && a.correctOptionText && (
                      <p className="text-slate-500">Correct: {a.correctOptionText}</p>
                    )}
                    <p className={a.isCorrect ? 'text-emerald-600' : 'text-red-600'}>
                      {a.isCorrect ? 'Correct' : 'Incorrect'} · {a.points} pts
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
