'use client'

import { Check, Circle } from 'lucide-react'
import type { LabProgress, ProgressStepState } from '@/lib/questionnaire-display'
import { cn } from '@/lib/utils'

export type { LabProgress }

const STEP_LABELS: Record<
  'virtualPractical' | 'questionnaire' | 'writtenReport' | 'finalGrade',
  string
> = {
  virtualPractical: 'Virtual Practical',
  questionnaire: 'Questionnaire',
  writtenReport: 'Written Report',
  finalGrade: 'Final Grade',
}

function visibleSteps(progress: LabProgress) {
  const keys = ['virtualPractical', 'questionnaire', 'writtenReport', 'finalGrade'] as const
  return keys
    .filter((key) => key === 'virtualPractical' || key === 'finalGrade' || progress[key] !== null)
    .map((key) => ({ key, label: STEP_LABELS[key], state: progress[key]! }))
}

function StepIcon({ state }: { state: ProgressStepState }) {
  if (state === 'completed') {
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white">
        <Check className="h-3.5 w-3.5 stroke-[3]" />
      </span>
    )
  }
  if (state === 'active') {
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-blue-600 bg-white">
        <span className="h-2 w-2 rounded-full bg-blue-600" />
      </span>
    )
  }
  return (
    <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-slate-200 bg-white">
      <Circle className="h-3 w-3 text-slate-300" />
    </span>
  )
}

export function LabProgressSidebar({ progress }: { progress: LabProgress }) {
  const steps = visibleSteps(progress)
  return (
    <aside className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5">
      <h2 className="app-section-title">Lab Progress</h2>
      <ul className="mt-4 space-y-4">
        {steps.map(({ key, label, state }) => {
          return (
            <li key={key} className="flex items-center gap-3">
              <StepIcon state={state as ProgressStepState} />
              <span
                className={cn(
                  'text-[0.9375rem] font-medium',
                  state === 'active' && 'text-blue-700',
                  state === 'completed' && 'text-slate-800',
                  state === 'pending' && 'text-slate-400'
                )}
              >
                {label}
              </span>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}
