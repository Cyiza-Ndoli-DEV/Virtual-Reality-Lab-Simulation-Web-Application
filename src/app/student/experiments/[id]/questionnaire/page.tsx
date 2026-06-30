'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { CheckCircle2 } from 'lucide-react'
import { ExperimentLabShell } from '@/components/student/experiment-lab-shell'
import { QuestionnaireReviewCard } from '@/components/student/questionnaire-review-card'
import { StudentPreLabBriefing } from '@/components/questionnaire/student-pre-lab-briefing'
import type { QuestionnaireConfig } from '@/lib/questionnaire'

export default function StudentQuestionnairePage() {
  const params = useParams()
  const router = useRouter()
  const experimentId = typeof params.id === 'string' ? params.id : ''

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [config, setConfig] = useState<QuestionnaireConfig | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const load = useCallback(async () => {
    if (!experimentId) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/student/experiments/${experimentId}/questionnaire`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Could not load briefing')
        return
      }
      setConfig(data.config as QuestionnaireConfig)
      setSubmitted(Boolean(data.submitted))
    } finally {
      setLoading(false)
    }
  }, [experimentId])

  useEffect(() => {
    queueMicrotask(() => {
      void load()
    })
  }, [load])

  async function handleContinue() {
    const res = await fetch(`/api/student/experiments/${experimentId}/questionnaire`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(data.error || 'Could not continue')
    }
    setSubmitted(true)
    router.push(`/student/experiments/${experimentId}`)
  }

  return (
    <ExperimentLabShell experimentId={experimentId}>
      {loading ? (
        <p className="text-sm text-slate-500">Loading briefing…</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : !config ? null : submitted ? (
        <>
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Briefing complete</p>
              <p className="mt-1 text-sm text-emerald-800">
                You can now start the virtual practical on the headset.
              </p>
            </div>
          </div>
          <QuestionnaireReviewCard
            config={config}
            answers={{}}
            contextOnly
            workflowStatus="completed"
            experimentId={experimentId}
          />
        </>
      ) : (
        <StudentPreLabBriefing config={config} onContinue={handleContinue} />
      )}
    </ExperimentLabShell>
  )
}
