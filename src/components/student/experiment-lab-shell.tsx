'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LabProgressTimeline } from '@/components/student/lab-progress-timeline'
import { ExperimentLabRefreshProvider } from '@/components/student/experiment-lab-refresh-context'
import type { LabProgress } from '@/lib/questionnaire-display'
import type { StudentQuizSummary } from '@/lib/quiz'

export interface ExperimentLabMeta {
  experiment: {
    id: string
    title: string
    description: string
    subject: { code: string; name: string } | null
  }
  labProgress: LabProgress
  questionnaireTitle: string | null
  reportTitle: string | null
  quizzes: StudentQuizSummary[]
}

export function ExperimentLabShell({
  experimentId,
  children,
  subtitle,
}: {
  experimentId: string
  children: React.ReactNode
  subtitle?: string
}) {
  const [meta, setMeta] = useState<ExperimentLabMeta | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setError('')
    const res = await fetch(`/api/student/experiments/${experimentId}`)
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(data.error || 'Could not load experiment')
      return
    }
    setMeta({
      experiment: data.experiment,
      labProgress: data.labProgress,
      questionnaireTitle: data.questionnaire?.title ?? null,
      reportTitle: data.report?.title ?? null,
      quizzes: Array.isArray(data.quizzes) ? data.quizzes : [],
    })
  }, [experimentId])

  useEffect(() => {
    queueMicrotask(() => {
      void load()
    })
  }, [load])

  if (error) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <p className="app-body-muted">{error}</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/student/dashboard">Back to my labs</Link>
        </Button>
      </div>
    )
  }

  if (!meta) {
    return <p className="app-body-muted">Loading…</p>
  }

  const sub =
    subtitle ??
    (meta.reportTitle
      ? meta.reportTitle
      : meta.questionnaireTitle
        ? `Lab Report Questionnaire${meta.experiment.subject ? ` · ${meta.experiment.subject.code}` : ''}`
        : meta.experiment.subject?.code ?? '')

  return (
    <ExperimentLabRefreshProvider refresh={load}>
      <div className="w-full">
        <Button asChild variant="ghost" className="app-body-muted mb-6 -ml-2 hover:text-slate-900">
          <Link href="/student/dashboard">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back to my labs
          </Link>
        </Button>

        <header className="mb-5">
          <h1 className="app-page-title">{meta.experiment.title}</h1>
          {sub ? <p className="app-page-subtitle mt-1">{sub}</p> : null}
        </header>

        <LabProgressTimeline progress={meta.labProgress} quizzes={meta.quizzes} />

        <div className="mt-8">{children}</div>
      </div>
    </ExperimentLabRefreshProvider>
  )
}
