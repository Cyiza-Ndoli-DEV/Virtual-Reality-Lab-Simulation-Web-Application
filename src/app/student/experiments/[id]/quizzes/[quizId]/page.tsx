'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { CheckCircle2, XCircle } from 'lucide-react'
import { ExperimentLabShell } from '@/components/student/experiment-lab-shell'
import { useExperimentLabRefresh } from '@/components/student/experiment-lab-refresh-context'
import { StudentQuizForm } from '@/components/student/student-quiz-form'
import { Button } from '@/components/ui/button'

import type { StudentQuizSummary } from '@/lib/quiz'

type QuizLoadResponse = {
  quiz: {
    id: string
    title: string
    description: string
    passMark: number
    timeLimit: number | null
    attemptsAllowed: number
    questions: {
      id: string
      questionText: string
      questionType: 'MCQ' | 'TRUE_FALSE'
      points: number
      options: { id: string; optionText: string }[]
    }[]
  }
  attemptsUsed: number
  attemptsAllowed: number
}

export default function StudentQuizPage() {
  const params = useParams()
  const router = useRouter()
  const refreshLab = useExperimentLabRefresh()
  const experimentId = typeof params.id === 'string' ? params.id : ''
  const quizId = typeof params.quizId === 'string' ? params.quizId : ''

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [payload, setPayload] = useState<QuizLoadResponse | null>(null)
  const [result, setResult] = useState<{
    percentage: number
    passed: boolean
    passMark: number
  } | null>(null)

  const load = useCallback(async () => {
    if (!experimentId || !quizId) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(
        `/api/student/experiments/${experimentId}/quizzes/${quizId}`
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (res.status === 403) {
          const expRes = await fetch(`/api/student/experiments/${experimentId}`)
          const expData = await expRes.json().catch(() => ({}))
          const quizzes = Array.isArray(expData.quizzes)
            ? (expData.quizzes as StudentQuizSummary[])
            : []
          const summary = quizzes.find((q) => q.id === quizId)
          if (summary?.latestAttempt) {
            setPayload({
              quiz: {
                id: summary.id,
                title: summary.title,
                description: summary.description,
                passMark: summary.passMark,
                timeLimit: summary.timeLimit,
                attemptsAllowed: summary.attemptsAllowed,
                questions: [],
              },
              attemptsUsed: summary.attemptsUsed,
              attemptsAllowed: summary.attemptsAllowed,
            })
            setResult({
              percentage: summary.latestAttempt.percentage,
              passed: summary.latestAttempt.passed,
              passMark: summary.passMark,
            })
            return
          }
        }
        setError(data.error || 'Could not load quiz')
        setPayload(null)
        return
      }
      setPayload(data as QuizLoadResponse)
    } finally {
      setLoading(false)
    }
  }, [experimentId, quizId])

  useEffect(() => {
    queueMicrotask(() => {
      void load()
    })
  }, [load])

  return (
    <ExperimentLabShell
      experimentId={experimentId}
      subtitle={payload?.quiz.title ?? 'Lab quiz'}
    >
      {loading ? (
        <p className="app-body-muted">Loading quiz…</p>
      ) : error ? (
        <div className="space-y-4">
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[0.9375rem] text-red-600">
            {error}
          </p>
          <Button asChild variant="outline">
            <Link href={`/student/experiments/${experimentId}`}>Back to lab</Link>
          </Button>
        </div>
      ) : !payload ? null : result ? (
        <div className="w-full space-y-6">
          <div
            className={
              result.passed
                ? 'flex items-start gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-5 text-emerald-900 sm:px-8 sm:py-6'
                : 'flex items-start gap-4 rounded-2xl border border-amber-200 bg-amber-50 px-6 py-5 text-amber-950 sm:px-8 sm:py-6'
            }
          >
            {result.passed ? (
              <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0" />
            ) : (
              <XCircle className="mt-0.5 h-6 w-6 shrink-0" />
            )}
            <div>
              <p className="app-card-title">
                {result.passed ? 'Quiz passed' : 'Quiz not passed'}
              </p>
              <p className="app-body mt-1">
                You scored {result.percentage}%. The pass mark is {result.passMark}%.
              </p>
            </div>
          </div>
          <Button
            asChild
            className="h-10 rounded-xl bg-slate-900 text-[0.9375rem] text-white hover:bg-slate-800"
          >
            <Link href={`/student/experiments/${experimentId}`}>Back to lab</Link>
          </Button>
        </div>
      ) : (
        <StudentQuizForm
          quiz={payload.quiz}
          attemptsUsed={payload.attemptsUsed}
          experimentId={experimentId}
          quizId={quizId}
          onSubmitted={(r) => {
            setResult(r)
            refreshLab?.()
            router.refresh()
          }}
        />
      )}
    </ExperimentLabShell>
  )
}
