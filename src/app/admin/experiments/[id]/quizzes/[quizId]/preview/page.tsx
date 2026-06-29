'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAdminPageHeader } from '@/components/admin/admin-app-header-context'
import type { QuizDetailDto } from '@/lib/quiz'

export default function AdminQuizPreviewPage() {
  const params = useParams()
  const router = useRouter()
  const experimentId = typeof params.id === 'string' ? params.id : ''
  const quizId = typeof params.quizId === 'string' ? params.quizId : ''

  const [quiz, setQuiz] = useState<QuizDetailDto | null>(null)
  const [loading, setLoading] = useState(true)

  useAdminPageHeader('Quiz preview', false)

  const load = useCallback(async () => {
    if (!experimentId || !quizId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/experiments/${experimentId}/quizzes/${quizId}`)
      const data = await res.json().catch(() => ({}))
      if (res.ok) setQuiz(data as QuizDetailDto)
    } finally {
      setLoading(false)
    }
  }, [experimentId, quizId])

  useEffect(() => {
    queueMicrotask(() => {
      void load()
    })
  }, [load])

  if (loading) return <p className="text-sm text-slate-500">Loading preview…</p>
  if (!quiz) return <p className="text-sm text-red-600">Quiz not found.</p>

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Button
        type="button"
        variant="ghost"
        className="gap-2 text-slate-600"
        onClick={() => router.push(`/admin/experiments/${experimentId}/quizzes/${quizId}`)}
      >
        <ArrowLeft className="size-4" />
        Back to edit
      </Button>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Student preview</p>
        <h1 className="app-page-title mt-2">{quiz.title}</h1>
        {quiz.description && <p className="mt-2 text-slate-600">{quiz.description}</p>}
        <p className="mt-3 text-sm text-slate-500">
          Pass mark: {quiz.passMark}%
          {quiz.timeLimit ? ` · Time limit: ${quiz.timeLimit} min` : ''}
          {` · Attempts: ${quiz.attemptsAllowed}`}
        </p>
      </div>

      <div className="space-y-4">
        {quiz.questions.map((q, index) => (
          <div key={q.id} className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-medium text-slate-500">
              Question {index + 1} · {q.points} pt{q.points !== 1 ? 's' : ''}
            </p>
            <p className="mt-2 font-medium text-slate-900">{q.questionText}</p>
            <ul className="mt-4 space-y-2">
              {q.options.map((o) => (
                <li
                  key={o.id}
                  className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
                >
                  <span className="size-4 shrink-0 rounded-full border-2 border-slate-300" />
                  {o.optionText}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
