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
    icon: Headset,
    title: 'Complete the VR practical',
    description: 'Sign in on the headset and finish the experiment in the virtual lab.',
  },
  {
    icon: ClipboardList,
    title: 'Submit the questionnaire',
    description: 'Return here and complete the post-lab questions for that experiment.',
  },
  {
    icon: FileText,
    title: 'Submit your written report',
    description: 'Add your lab write-up when the report task is available.',
  },
] as const

function firstName(fullName: string | null) {
  if (!fullName?.trim()) return null
  return fullName.trim().split(/\s+/)[0]
}

function LabWorkflowGuide({ className }: { className?: string }) {
  return (
    <section
      className={cn(
        'rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm',
        className
      )}
    >
      <h2 className="text-sm font-semibold text-slate-900">How it works</h2>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">
        Follow these steps for each practical assigned to you.
      </p>
      <ol className="mt-4 space-y-4">
        {WORKFLOW_STEPS.map((step, index) => (
          <li key={step.title} className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <step.icon className="h-4 w-4" aria-hidden />
            </div>
            <div className="min-w-0 pt-0.5">
              <p className="text-xs font-medium text-slate-400">Step {index + 1}</p>
              <p className="text-sm font-medium text-slate-900">{step.title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
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
    sortedLabs.length > 1
      ? 'grid gap-4 sm:grid-cols-2'
      : 'grid gap-4'

  return (
    <div className="flex flex-1 flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start lg:gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex min-w-0 flex-col gap-6">
        <header className="space-y-1">
          <p className="text-sm font-medium text-blue-600">
            {greetingName ? `Welcome back, ${greetingName}` : 'Welcome back'}
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">My labs</h1>
          <p className="max-w-2xl text-sm leading-relaxed text-slate-500">
            Open a lab to view your VR results, complete questionnaires, and submit
            written work.
          </p>
        </header>

        <div className="lg:hidden">
          <StatsBar stats={stats} layout="row" />
        </div>

        {sortedLabs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
            <p className="text-sm text-slate-500">No experiments are available yet.</p>
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

        <div className="lg:hidden">
          <LabWorkflowGuide />
        </div>
      </div>

      <aside className="hidden shrink-0 space-y-5 lg:block lg:sticky lg:top-8">
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Your progress
          </h2>
          <StatsBar stats={stats} layout="stack" />
        </section>
        <LabWorkflowGuide />
      </aside>
    </div>
  )
}
