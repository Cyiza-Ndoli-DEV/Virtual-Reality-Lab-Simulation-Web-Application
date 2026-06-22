'use client'

import Link from 'next/link'
import { FlaskConical, Lock, Microscope, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LabWorkflowStatusBadge } from '@/components/student/lab-workflow-status-badge'
import type { LabWorkflowStatus } from '@/lib/lab-workflow-status'
import { subjectIconKey, type LabStatus } from '@/lib/student-lab-status'
import { cn } from '@/lib/utils'

export interface LabCardData {
  id: string
  title: string
  description: string
  subject: { code: string; name: string } | null
  status: LabStatus
  hasQuestionnaire: boolean
  submittedAt: string | null
  workflowStatus: LabWorkflowStatus
  activeSessionId: string | null
  progressPercent: number
  gradeLabel: string | null
  unlocksAt: string | null
}

function LabIcon({ subjectCode }: { subjectCode: string | null }) {
  const key = subjectIconKey(subjectCode)
  const base = 'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl'
  if (key === 'phy') {
    return (
      <div className={cn(base, 'bg-blue-50 text-blue-600')}>
        <Zap className="h-6 w-6" />
      </div>
    )
  }
  if (key === 'bio') {
    return (
      <div className={cn(base, 'bg-emerald-50 text-emerald-600')}>
        <Microscope className="h-6 w-6" />
      </div>
    )
  }
  if (key === 'chem') {
    return (
      <div className={cn(base, 'bg-blue-50 text-blue-600')}>
        <FlaskConical className="h-6 w-6" />
      </div>
    )
  }
  return (
    <div className={cn(base, 'bg-blue-50 text-blue-600')}>
      <FlaskConical className="h-6 w-6" />
    </div>
  )
}

function formatUnlockDate(iso: string) {
  try {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(
      new Date(iso)
    )
  } catch {
    return iso
  }
}

export function LabCard({
  lab,
  fillHeight = false,
}: {
  lab: LabCardData
  fillHeight?: boolean
}) {
  const isLocked = lab.status === 'locked'
  const isActive = lab.status === 'active'
  const labHref = `/student/experiments/${lab.id}`

  return (
    <article
      className={cn(
        'relative rounded-2xl border bg-white p-5 shadow-sm',
        fillHeight && 'flex h-full w-full flex-col',
        isActive && 'border-2 border-blue-600 shadow-md',
        isLocked && 'border-slate-200 opacity-75',
        !isActive && !isLocked && 'border-slate-200'
      )}
    >
      {isActive ? (
        <span className="absolute right-4 top-0 -translate-y-1/2 rounded-md bg-blue-600 px-3 py-1 text-xs font-semibold text-white shadow-sm">
          Active Session
        </span>
      ) : null}

      <div
        className={cn(
          'flex gap-4',
          fillHeight
            ? 'flex-1 flex-col'
            : 'flex-col sm:flex-row sm:items-start sm:justify-between'
        )}
      >
        <div className={cn('flex min-w-0 gap-4', fillHeight ? 'flex-1 flex-col' : 'flex-1')}>
          {isLocked ? (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
              <Lock className="h-6 w-6" />
            </div>
          ) : (
            <LabIcon subjectCode={lab.subject?.code ?? null} />
          )}

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2
                className={cn(
                  'text-lg font-semibold',
                  isLocked ? 'text-slate-500' : 'text-slate-900'
                )}
              >
                {lab.title}
              </h2>
              {lab.subject ? (
                <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-xs font-medium uppercase tracking-wide text-slate-600">
                  {lab.subject.code}
                </span>
              ) : null}
              {!isLocked ? (
                <LabWorkflowStatusBadge status={lab.workflowStatus} />
              ) : null}
            </div>
            <p
              className={cn(
                'mt-1.5 line-clamp-2 text-sm leading-relaxed',
                isLocked ? 'text-slate-400' : 'text-slate-600'
              )}
            >
              {lab.description}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {isLocked && lab.unlocksAt ? (
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-500">
                  Unlocks {formatUnlockDate(lab.unlocksAt)}
                </span>
              ) : null}

              {lab.gradeLabel ? (
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                  Grade: {lab.gradeLabel}
                </span>
              ) : null}
            </div>

            {isActive ? (
              <div className="mt-4 max-w-md">
                <div className="mb-1.5 flex justify-between text-xs font-medium text-slate-600">
                  <span>VR progress</span>
                  <span>{lab.progressPercent}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-blue-600 transition-all duration-300"
                    style={{ width: `${lab.progressPercent}%` }}
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div
          className={cn(
            'flex shrink-0 items-center',
            fillHeight ? 'mt-auto pt-2' : 'sm:pt-1'
          )}
        >
          {isLocked ? null : (
            <Button
              asChild
              className="rounded-xl bg-blue-600 px-5 text-white hover:bg-blue-700"
            >
              <Link href={labHref}>Open lab</Link>
            </Button>
          )}
        </div>
      </div>
    </article>
  )
}
