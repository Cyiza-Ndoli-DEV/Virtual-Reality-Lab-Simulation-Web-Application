'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle2 } from 'lucide-react'
import { ExperimentLabShell } from '@/components/student/experiment-lab-shell'
import { QuestionnaireReviewCard } from '@/components/student/questionnaire-review-card'
import { StudentQuestionnaireForm } from '@/components/questionnaire/student-questionnaire-form'
import type { QuestionnaireAnswers, QuestionnaireConfig } from '@/lib/questionnaire'

export default function StudentQuestionnairePage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const experimentId = typeof params.id === 'string' ? params.id : ''
  const sessionId = searchParams.get('sessionId')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [config, setConfig] = useState<QuestionnaireConfig | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [initialAnswers, setInitialAnswers] = useState<QuestionnaireAnswers | null>(null)

  const load = useCallback(async () => {
    if (!experimentId) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/student/experiments/${experimentId}/questionnaire`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Could not load questionnaire')
        return
      }
      setConfig(data.config as QuestionnaireConfig)
      setSubmitted(Boolean(data.submitted))
      if (data.answers) setInitialAnswers(data.answers as QuestionnaireAnswers)
    } finally {
      setLoading(false)
    }
  }, [experimentId])

  useEffect(() => {
    queueMicrotask(() => {
      void load()
    })
  }, [load])

  async function handleSubmit(answers: QuestionnaireAnswers) {
    const res = await fetch(`/api/student/experiments/${experimentId}/questionnaire`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        answers,
        sessionId: sessionId ?? undefined,
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(data.error || 'Could not submit questionnaire')
    }
    setSubmitted(true)
    router.push(`/student/experiments/${experimentId}`)
  }

  return (
    <ExperimentLabShell experimentId={experimentId}>
      {loading ? (
        <p className="text-sm text-slate-500">Loading questionnaire…</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : !config ? null : submitted ? (
        <>
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Questionnaire submitted</p>
              <p className="mt-1 text-sm text-emerald-800">
                Your responses have been saved and locked.
              </p>
            </div>
          </div>
          <QuestionnaireReviewCard
            config={config}
            answers={(initialAnswers ?? {}) as QuestionnaireAnswers}
            workflowStatus="pending"
            experimentId={experimentId}
          />
        </>
      ) : (
        <StudentQuestionnaireForm
          config={config}
          initialAnswers={initialAnswers}
          onSubmit={handleSubmit}
        />
      )}
    </ExperimentLabShell>
  )
}
