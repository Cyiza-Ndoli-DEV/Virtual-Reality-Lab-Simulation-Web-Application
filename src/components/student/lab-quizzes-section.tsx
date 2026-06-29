'use client'

import Link from 'next/link'
import { CheckCircle2, ClipboardList, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { StudentQuizSummary } from '@/lib/quiz'
import { cn } from '@/lib/utils'

export function LabQuizzesSection({
  quizzes,
  experimentId,
  disabled = false,
  className,
  embedded = false,
}: {
  quizzes: StudentQuizSummary[]
  experimentId: string
  disabled?: boolean
  className?: string
  /** When true, render only quiz cards (for use inside a shared post-lab grid). */
  embedded?: boolean
}) {
  if (quizzes.length === 0) return null

  const cards = (
    <ul
      className={cn(
        embedded
          ? 'contents list-none p-0'
          : 'grid list-none gap-4 p-0 sm:grid-cols-2',
        !embedded && className
      )}
    >
      {quizzes.map((quiz) => (
        <li key={quiz.id} className={cn(embedded ? 'flex min-h-0' : 'flex min-h-0')}>
          <QuizCard quiz={quiz} experimentId={experimentId} disabled={disabled} />
        </li>
      ))}
    </ul>
  )

  if (embedded) return cards

  return (
    <section className={cn('mt-6 space-y-4', className)}>
      <div>
        <h2 className="app-section-title">Lab quizzes</h2>
        <p className="app-body-muted mt-1">
          {disabled
            ? 'Quizzes unlock after you complete the virtual practical.'
            : 'Test your understanding with the quiz for this practical.'}
        </p>
      </div>
      {cards}
    </section>
  )
}

function QuizCard({
  quiz,
  experimentId,
  disabled,
}: {
  quiz: StudentQuizSummary
  experimentId: string
  disabled: boolean
}) {
  const latest = quiz.latestAttempt
  const exhausted = !quiz.canAttempt
  const canStart = !disabled && quiz.canAttempt

  return (
    <article className="flex h-full w-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
          <ClipboardList className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="app-card-title">{quiz.title}</p>
          {quiz.description ? (
            <p className="app-body-muted mt-1 line-clamp-2">{quiz.description}</p>
          ) : null}
        </div>
      </div>

      <dl className="app-caption mt-4 grid gap-1 text-slate-500">
        <div className="flex justify-between gap-2">
          <dt>Questions</dt>
          <dd className="font-medium text-slate-700">{quiz.questionCount}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Pass mark</dt>
          <dd className="font-medium text-slate-700">{quiz.passMark}%</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Attempts</dt>
          <dd className="font-medium text-slate-700">
            {quiz.attemptsUsed} / {quiz.attemptsAllowed}
          </dd>
        </div>
      </dl>

      {latest ? (
        <div
          className={cn(
            'mt-4 flex items-center gap-2 rounded-lg px-3 py-2 text-[0.8125rem] font-medium',
            latest.passed
              ? 'bg-emerald-50 text-emerald-800'
              : 'bg-amber-50 text-amber-900'
          )}
        >
          {latest.passed ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <XCircle className="h-4 w-4 shrink-0" />
          )}
          <span>
            Last score: {latest.percentage}% — {latest.passed ? 'Passed' : 'Not passed'}
          </span>
        </div>
      ) : null}

      <div className="mt-auto pt-4">
        <Button
          asChild={canStart}
          className="h-10 w-full rounded-xl bg-violet-600 text-[0.9375rem] text-white hover:bg-violet-700"
          disabled={!canStart}
        >
          {canStart ? (
            <Link href={`/student/experiments/${experimentId}/quizzes/${quiz.id}`}>
              {latest ? 'Retake quiz' : 'Start quiz'}
            </Link>
          ) : (
            <span>
              {disabled
                ? 'Complete VR first'
                : exhausted
                  ? 'No attempts left'
                  : 'Start quiz'}
            </span>
          )}
        </Button>
      </div>
    </article>
  )
}
