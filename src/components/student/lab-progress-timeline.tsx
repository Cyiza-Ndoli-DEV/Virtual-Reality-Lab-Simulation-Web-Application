'use client'

import { Check } from 'lucide-react'
import type { LabProgress, ProgressStepState } from '@/lib/questionnaire-display'
import { buildLabTimelineSteps, deriveQuizTimelineState } from '@/lib/lab-progress-steps'
import type { StudentQuizSummary } from '@/lib/quiz'
import { cn } from '@/lib/utils'

function StepMarker({ state }: { state: ProgressStepState }) {
  if (state === 'completed') {
    return (
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm">
        <Check className="h-4 w-4 stroke-[3]" />
      </span>
    )
  }
  if (state === 'active') {
    return (
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-blue-600 bg-white shadow-sm ring-4 ring-blue-100">
        <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
      </span>
    )
  }
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-slate-200 bg-white">
      <span className="h-2 w-2 rounded-full bg-slate-200" />
    </span>
  )
}

export function LabProgressTimeline({
  progress,
  quizzes,
}: {
  progress: LabProgress
  quizzes: StudentQuizSummary[]
}) {
  const vrCompleted = progress.virtualPractical === 'completed'
  const quizState = deriveQuizTimelineState(quizzes, vrCompleted)
  const steps = buildLabTimelineSteps(progress, quizState)

  return (
    <nav
      aria-label="Lab progress"
      className="rounded-2xl border border-slate-200 bg-white px-4 py-5 shadow-sm sm:px-6"
    >
      <p className="app-label mb-4">Your progress</p>
      <ol className="flex w-full min-w-0 items-start gap-0 overflow-x-auto pb-1">
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1
          return (
            <li
              key={step.key}
              className="flex min-w-[6rem] flex-1 flex-col items-center sm:min-w-0"
            >
              <div className="flex w-full items-center">
                {index > 0 ? (
                  <span
                    className={cn(
                      'h-0.5 min-w-3 flex-1',
                      steps[index - 1].state === 'completed' ? 'bg-emerald-400' : 'bg-slate-200'
                    )}
                    aria-hidden
                  />
                ) : (
                  <span className="min-w-0 flex-1" aria-hidden />
                )}
                <StepMarker state={step.state} />
                {!isLast ? (
                  <span
                    className={cn(
                      'h-0.5 min-w-3 flex-1',
                      step.state === 'completed' ? 'bg-emerald-400' : 'bg-slate-200'
                    )}
                    aria-hidden
                  />
                ) : (
                  <span className="min-w-0 flex-1" aria-hidden />
                )}
              </div>
              <p
                className={cn(
                  'mt-2 px-1 text-center text-sm font-medium leading-snug',
                  step.state === 'active' && 'text-blue-700',
                  step.state === 'completed' && 'text-slate-800',
                  step.state === 'pending' && 'text-slate-400'
                )}
              >
                {step.label}
              </p>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
