'use client'

import { useMemo } from 'react'
import { ClipboardList, FileText, Headset } from 'lucide-react'
import { LabCard, type LabCardData } from '@/components/student/lab-card'
import { StatsBar, type DashboardStats } from '@/components/student/stats-bar'
import type { LabStatus } from '@/lib/student-lab-status'
import type { StudentExperimentsPayload } from '@/lib/data/student-experiments'
import { cn } from '@/lib/utils'

const statusOrder: Record<LabStatus, number> = {
  active: 0,
  completed: 1,
  available: 2,
  locked: 3,
}

const WORKFLOW_STEPS = [
  {
    icon: ClipboardList,
    title: 'Complete the pre-lab briefing',
    description:
      'Read the scenario, materials, and task on the web portal before VR — no writing required.',
  },
  {
    icon: Headset,
    title: 'Complete the VR practical',
    description: 'Sign in on the headset and perform the experiment in the virtual lab.',
  },
  {
    icon: FileText,
    title: 'Submit your written report',
    description: 'Add your lab write-up and take any quizzes after the VR session.',
  },
] as const

function firstName(fullName: string | null) {
  if (!fullName?.trim()) return null
  return fullName.trim().split(/\s+/)[0]
}

function LabWorkflowGuide({
  className,
  variant = 'vertical',
}: {
  className?: string
  variant?: 'vertical' | 'horizontal'
}) {
  return (
    <section
      className={cn(
        'rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6',
        className
      )}
    >
      <h2 className="app-section-title">How it works</h2>
      <p className="app-body-muted mt-1">
        Follow these steps for each practical assigned to you.
      </p>
      <ol
        className={cn(
          'mt-4',
          variant === 'horizontal'
            ? 'grid gap-4 sm:grid-cols-3'
            : 'space-y-4'
        )}
      >
        {WORKFLOW_STEPS.map((step, index) => (
          <li
            key={step.title}
            className={cn(
              'flex gap-3',
              variant === 'horizontal' &&
                'flex-col rounded-xl border border-slate-100 bg-slate-50/60 p-4'
            )}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <step.icon className="h-4 w-4" aria-hidden />
            </div>
            <div className="min-w-0 pt-0.5">
              <p className="app-caption font-medium text-slate-400">Step {index + 1}</p>
              <p className="text-[0.9375rem] font-medium text-slate-900">{step.title}</p>
              <p className="app-body-muted mt-0.5">
                {step.description}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

export function StudentDashboardClient({
  initialData,
  userName,
}: {
  initialData: StudentExperimentsPayload
  userName: string | null
}) {
  const stats = initialData.stats as DashboardStats
  const labs = initialData.experiments as LabCardData[]
  const greetingName = firstName(userName)

  const sortedLabs = useMemo(
    () =>
      [...labs].sort(
        (a, b) => (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9)
      ),
    [labs]
  )

  const labGridClass =
    sortedLabs.length === 1
      ? 'grid gap-4'
      : sortedLabs.length === 2
        ? 'grid gap-4 sm:grid-cols-2'
        : 'grid gap-4 sm:grid-cols-2 xl:grid-cols-3'

  return (
    <div className="flex flex-1 flex-col gap-8">
      <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <header className="space-y-1.5">
            <p className="app-eyebrow">
              {greetingName ? `Welcome back, ${greetingName}` : 'Welcome back'}
            </p>
            <h1 className="app-page-title">My labs</h1>
            <p className="app-page-subtitle max-w-xl">
              Open a lab to view your VR results, complete questionnaires, and submit
              written work.
            </p>
          </header>
          <div className="w-full shrink-0 xl:max-w-2xl">
            <StatsBar stats={stats} layout="row" />
          </div>
        </div>
      </section>

      <section className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="app-label">Assigned experiments</h2>
          {sortedLabs.length > 0 ? (
            <p className="app-caption text-slate-400">
              {sortedLabs.length} {sortedLabs.length === 1 ? 'lab' : 'labs'}
            </p>
          ) : null}
        </div>

        {sortedLabs.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
            <p className="app-body-muted">No experiments are available yet.</p>
          </div>
        ) : (
          <ul className={cn(labGridClass, 'list-none p-0')}>
            {sortedLabs.map((lab) => (
              <li key={lab.id} className="flex min-h-0">
                <LabCard lab={lab} fillHeight />
              </li>
            ))}
          </ul>
        )}
      </section>

      <LabWorkflowGuide variant="horizontal" className="mt-auto" />
    </div>
  )
}
