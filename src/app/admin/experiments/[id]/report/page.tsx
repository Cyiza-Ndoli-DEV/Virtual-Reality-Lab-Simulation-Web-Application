'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useAdminPageHeader } from '@/components/admin/admin-app-header-context'
import { emptyReportAssignment, type ReportAssignmentConfig } from '@/lib/lab-report'

export default function AdminExperimentReportPage() {
  const params = useParams()
  const router = useRouter()
  const experimentId = typeof params.id === 'string' ? params.id : ''

  const [experimentTitle, setExperimentTitle] = useState('')
  const [configured, setConfigured] = useState(false)
  const [assignment, setAssignment] = useState<ReportAssignmentConfig>(
    emptyReportAssignment()
  )
  const [loading, setLoading] = useState(true)
  const [saveBusy, setSaveBusy] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveOk, setSaveOk] = useState(false)

  useAdminPageHeader('Lab report assignment', false)

  const load = useCallback(async () => {
    if (!experimentId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/experiments/${experimentId}/report`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return
      setExperimentTitle(data.experimentTitle ?? '')
      setConfigured(Boolean(data.configured))
      if (data.assignment) setAssignment(data.assignment as ReportAssignmentConfig)
    } finally {
      setLoading(false)
    }
  }, [experimentId])

  useEffect(() => {
    queueMicrotask(() => {
      void load()
    })
  }, [load])

  async function handleSave() {
    setSaveBusy(true)
    setSaveError('')
    setSaveOk(false)
    try {
      const res = await fetch(`/api/admin/experiments/${experimentId}/report`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignment }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setSaveError(data.error || 'Could not save')
        return
      }
      setConfigured(true)
      setSaveOk(true)
    } finally {
      setSaveBusy(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Loading report assignment…</p>
  }

  return (
    <div className="max-w-3xl">
      <Button
        type="button"
        variant="ghost"
        className="mb-6 -ml-2 text-slate-600"
        onClick={() => router.push('/admin/experiments')}
      >
        <ArrowLeft className="mr-1.5 h-4 w-4" />
        Back to experiments
      </Button>

      <p className="text-sm text-slate-500">
        {experimentTitle
          ? `Set up the written lab report students submit after completing the VR practical for ${experimentTitle}.`
          : 'Set up the written lab report for this experiment.'}
      </p>

      {configured ? (
        <p className="mt-2 text-sm font-medium text-emerald-700">
          Report assignment is active — students can submit after VR.
        </p>
      ) : null}

      <div className="mt-8 space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-2">
          <Label htmlFor="report-title">Report title</Label>
          <Input
            id="report-title"
            value={assignment.title}
            onChange={(e) =>
              setAssignment((a) => ({ ...a, title: e.target.value }))
            }
            placeholder="e.g. Acid–base titration lab report"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="report-instructions">Instructions for students</Label>
          <Textarea
            id="report-instructions"
            value={assignment.instructions}
            onChange={(e) =>
              setAssignment((a) => ({ ...a, instructions: e.target.value }))
            }
            className="min-h-40"
            placeholder="Describe what students should include: aim, method, results, discussion, conclusion, references to VR observations…"
          />
          <p className="text-xs text-slate-500">
            Shown on the student report page before they write their submission.
          </p>
        </div>

        {saveError ? <p className="text-sm text-red-600">{saveError}</p> : null}
        {saveOk ? (
          <p className="text-sm text-emerald-700">Saved successfully.</p>
        ) : null}

        <Button
          type="button"
          className="rounded-xl bg-blue-600 hover:bg-blue-700"
          disabled={saveBusy}
          onClick={() => void handleSave()}
        >
          {saveBusy ? 'Saving…' : configured ? 'Update assignment' : 'Publish assignment'}
        </Button>
      </div>
    </div>
  )
}
