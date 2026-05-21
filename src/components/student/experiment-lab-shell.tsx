'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LabProgressSidebar, type LabProgress } from '@/components/student/lab-progress-sidebar'
import { ExperimentLabRefreshProvider } from '@/components/student/experiment-lab-refresh-context'

export interface ExperimentLabMeta {
  experiment: {
    id: string
    title: string
    description: string
    subject: { code: string; name: string } | null
  }
  labProgress: LabProgress
  questionnaireTitle: string | null
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
        <p className="text-sm text-slate-600">{error}</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/student/dashboard">Back to my labs</Link>
        </Button>
      </div>
    )
  }

  if (!meta) {
    return <p className="text-sm text-slate-500">Loading…</p>
  }

  const sub =
    subtitle ??
    (meta.questionnaireTitle
      ? `Lab Report Questionnaire${meta.experiment.subject ? ` · ${meta.experiment.subject.code}` : ''}`
      : meta.experiment.subject?.code ?? '')

  return (
    <ExperimentLabRefreshProvider refresh={load}>
      <div>
        <Button asChild variant="ghost" className="mb-6 -ml-2 text-slate-600 hover:text-slate-900">
          <Link href="/student/dashboard">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back to my labs
          </Link>
        </Button>

        <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
          <LabProgressSidebar progress={meta.labProgress} />
          <div className="min-w-0">
            <header className="mb-6">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {meta.experiment.title}
              </h1>
              {sub ? <p className="mt-1 text-sm text-slate-500">{sub}</p> : null}
            </header>
            {children}
          </div>
        </div>
      </div>
    </ExperimentLabRefreshProvider>
  )
}
