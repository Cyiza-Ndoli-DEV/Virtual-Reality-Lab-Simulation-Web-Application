'use client'

import { Check, Circle } from 'lucide-react'
import type { ProgressStepState } from '@/lib/questionnaire-display'
import { cn } from '@/lib/utils'

export type LabProgress = {
  virtualPractical: ProgressStepState
  questionnaire: ProgressStepState
  finalGrade: ProgressStepState
}

const steps: { key: keyof LabProgress; label: string }[] = [
  { key: 'virtualPractical', label: 'Virtual Practical' },
  { key: 'questionnaire', label: 'Questionnaire' },
  { key: 'finalGrade', label: 'Final Grade' },
]

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
  return (
    <aside className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5">
      <h2 className="text-sm font-semibold text-slate-900">Lab Progress</h2>
      <ul className="mt-4 space-y-4">
        {steps.map(({ key, label }) => {
          const state = progress[key]
          return (
            <li key={key} className="flex items-center gap-3">
              <StepIcon state={state} />
              <span
                className={cn(
                  'text-sm font-medium',
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
