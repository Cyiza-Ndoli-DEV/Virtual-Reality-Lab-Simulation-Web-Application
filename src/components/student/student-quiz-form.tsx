'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type QuizQuestion = {
  id: string
  questionText: string
  questionType: 'MCQ' | 'TRUE_FALSE'
  points: number
  options: { id: string; optionText: string }[]
}

type StudentQuizPayload = {
  id: string
  title: string
  description: string
  passMark: number
  timeLimit: number | null
  attemptsAllowed: number
  questions: QuizQuestion[]
}

export function StudentQuizForm({
  quiz,
  attemptsUsed,
  experimentId,
  quizId,
  onSubmitted,
}: {
  quiz: StudentQuizPayload
  attemptsUsed: number
  experimentId: string
  quizId: string
  onSubmitted: (result: {
    percentage: number
    passed: boolean
    passMark: number
  }) => void
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState<number | null>(
    quiz.timeLimit ? quiz.timeLimit * 60 : null
  )

  const allAnswered = useMemo(
    () => quiz.questions.every((q) => Boolean(answers[q.id])),
    [answers, quiz.questions]
  )

  useEffect(() => {
    if (secondsLeft === null || secondsLeft <= 0) return
    const timer = window.setInterval(() => {
      setSecondsLeft((s) => (s === null || s <= 1 ? 0 : s - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [secondsLeft])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (busy || !allAnswered) return
    setError('')
    setBusy(true)
    try {
      const res = await fetch(
        `/api/student/experiments/${experimentId}/quizzes/${quizId}/submit`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            answers: quiz.questions.map((q) => ({
              questionId: q.id,
              selectedOptionId: answers[q.id],
            })),
          }),
        }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Could not submit quiz')
        return
      }
      onSubmitted({
        percentage: data.attempt.percentage as number,
        passed: data.attempt.passed as boolean,
        passMark: data.passMark as number,
      })
    } finally {
      setBusy(false)
    }
  }

  const attemptsRemaining = quiz.attemptsAllowed - attemptsUsed

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="w-full space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="app-card-title">{quiz.title}</p>
        {quiz.description ? (
          <p className="app-body-muted mt-1.5">{quiz.description}</p>
        ) : null}
        <p className="app-caption mt-3">
          Pass mark: {quiz.passMark}%
          {quiz.timeLimit ? ` · Time limit: ${quiz.timeLimit} min` : ''}
          {` · Attempt ${attemptsUsed + 1} of ${quiz.attemptsAllowed}`}
          {attemptsRemaining <= 1 ? ' (last attempt)' : ''}
        </p>
        {secondsLeft !== null ? (
          <p
            className={cn(
              'mt-2 text-[0.9375rem] font-semibold',
              secondsLeft <= 60 ? 'text-red-600' : 'text-slate-700'
            )}
          >
            Time left: {formatTime(secondsLeft)}
          </p>
        ) : null}
      </div>

      <ol className="space-y-4">
        {quiz.questions.map((q, index) => (
          <li
            key={q.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
          >
            <p className="app-caption">
              Question {index + 1} · {q.points} pt{q.points !== 1 ? 's' : ''}
            </p>
            <p className="app-body mt-2 font-medium text-slate-900">{q.questionText}</p>
            <ul className="mt-4 space-y-2">
              {q.options.map((o) => {
                const selected = answers[q.id] === o.id
                return (
                  <li key={o.id}>
                    <label
                      className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors',
                        selected
                          ? 'border-violet-300 bg-violet-50'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      )}
                    >
                      <input
                        type="radio"
                        name={q.id}
                        value={o.id}
                        checked={selected}
                        onChange={() =>
                          setAnswers((prev) => ({ ...prev, [q.id]: o.id }))
                        }
                        className="size-4 shrink-0 accent-violet-600"
                      />
                      <span className="app-body text-slate-800">{o.optionText}</span>
                    </label>
                  </li>
                )
              })}
            </ul>
          </li>
        ))}
      </ol>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[0.9375rem] text-red-600">
          {error}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={busy || !allAnswered || secondsLeft === 0}
        className="h-10 rounded-xl bg-violet-600 px-6 text-[0.9375rem] text-white hover:bg-violet-700 disabled:opacity-60"
      >
        {busy ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Submitting…
          </>
        ) : (
          'Submit quiz'
        )}
      </Button>
    </form>
  )
}

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
