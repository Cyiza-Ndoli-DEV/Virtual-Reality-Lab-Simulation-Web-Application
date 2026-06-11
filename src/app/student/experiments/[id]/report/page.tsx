'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ExperimentLabShell } from '@/components/student/experiment-lab-shell'
import { MIN_REPORT_CONTENT_LENGTH } from '@/lib/lab-report'

export default function StudentReportPage() {
  const params = useParams()
  const router = useRouter()
  const experimentId = typeof params.id === 'string' ? params.id : ''

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [title, setTitle] = useState('')
  const [instructions, setInstructions] = useState('')
  const [content, setContent] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [reviewStatus, setReviewStatus] = useState<'PENDING' | 'COMPLETED' | null>(
    null
  )
  const [teacherFeedback, setTeacherFeedback] = useState<string | null>(null)
  const [submitBusy, setSubmitBusy] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const load = useCallback(async () => {
    if (!experimentId) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/student/experiments/${experimentId}/report`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Could not load lab report')
        return
      }
      setTitle(data.assignment?.title ?? 'Lab report')
      setInstructions(data.assignment?.instructions ?? '')
      setSubmitted(Boolean(data.submitted))
      setReviewStatus(data.reviewStatus ?? null)
      setTeacherFeedback(data.teacherFeedback ?? null)
      if (data.content) setContent(data.content as string)
    } finally {
      setLoading(false)
    }
  }, [experimentId])

  useEffect(() => {
    queueMicrotask(() => {
      void load()
    })
  }, [load])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitBusy(true)
    setSubmitError('')
    try {
      const res = await fetch(`/api/student/experiments/${experimentId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setSubmitError(data.error || 'Could not submit report')
        return
      }
      router.push(`/student/experiments/${experimentId}`)
    } finally {
      setSubmitBusy(false)
    }
  }

  const locked = submitted

  return (
    <ExperimentLabShell experimentId={experimentId} subtitle={title}>
      {loading ? (
        <p className="text-sm text-slate-500">Loading lab report…</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : submitted ? (
        <>
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Lab report submitted</p>
              <p className="mt-1 text-sm text-emerald-800">
                {reviewStatus === 'COMPLETED'
                  ? 'Your teacher has reviewed this report.'
                  : 'Your report is saved and awaiting teacher review.'}
              </p>
            </div>
          </div>
          {instructions ? (
            <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Assignment
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                {instructions}
              </p>
            </div>
          ) : null}
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <p className="text-sm font-medium text-slate-900">Your report</p>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
              {content}
            </p>
          </div>
          {teacherFeedback ? (
            <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm font-semibold text-blue-900">Teacher feedback</p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-blue-800">
                {teacherFeedback}
              </p>
            </div>
          ) : null}
          <Button asChild variant="outline" className="mt-6">
            <a href={`/student/experiments/${experimentId}`}>Back to lab</a>
          </Button>
        </>
      ) : (
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
          {instructions ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4">
              <p className="text-sm font-semibold text-amber-950">Your teacher&apos;s instructions</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-amber-900/90">
                {instructions}
              </p>
            </div>
          ) : null}

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <Label htmlFor="report-content" className="text-sm font-medium text-slate-900">
              Write your lab report
            </Label>
            <p className="mt-1 text-sm text-slate-500">
              Describe what you did in the VR practical, your observations, results, and
              conclusions. Minimum {MIN_REPORT_CONTENT_LENGTH} characters.
            </p>
            <Textarea
              id="report-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={locked}
              className="mt-4 min-h-64 text-sm leading-relaxed"
              placeholder="Introduction… Method… Results… Discussion… Conclusion…"
            />
            <p className="mt-2 text-xs text-slate-400">
              {content.trim().length} / {MIN_REPORT_CONTENT_LENGTH} characters minimum
            </p>
          </div>

          {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}

          <div className="flex flex-wrap gap-3">
            <Button
              type="submit"
              className="rounded-xl bg-blue-600 hover:bg-blue-700"
              disabled={submitBusy || locked}
            >
              {submitBusy ? 'Submitting…' : 'Submit lab report'}
            </Button>
            <Button type="button" variant="outline" asChild>
              <a href={`/student/experiments/${experimentId}`}>Cancel</a>
            </Button>
          </div>
        </form>
      )}
    </ExperimentLabShell>
  )
}
