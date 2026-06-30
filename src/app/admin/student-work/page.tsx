'use client'

import { useCallback, useEffect, useState } from 'react'
import { Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAdminPageHeader } from '@/components/admin/admin-app-header-context'
import { LabWorkflowStatusBadge } from '@/components/student/lab-workflow-status-badge'
import { QuestionnaireReviewCard } from '@/components/student/questionnaire-review-card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { QuestionnaireAnswers, QuestionnaireConfig } from '@/lib/questionnaire'
import {
  deriveLabWorkflowStatus,
  type LabWorkflowStatus,
} from '@/lib/lab-workflow-status'
import type { FinalGradeBreakdown } from '@/lib/experiment-grading'
import { GradeBreakdown } from '@/components/grading/grade-breakdown'
import { cn } from '@/lib/utils'

type Filter = 'PENDING' | 'COMPLETED' | 'ALL'

interface SubmissionListRow {
  id: string
  submittedAt: string
  reviewedAt: string | null
  reviewStatus: 'PENDING' | 'COMPLETED'
  student: { id: string; name: string; email: string }
  experiment: {
    id: string
    title: string
    subject: { code: string; name: string } | null
  }
  questionnaireTitle: string
}

interface SubmissionDetail extends SubmissionListRow {
  answers: QuestionnaireAnswers
  config: QuestionnaireConfig | null
  gradeBreakdown: FinalGradeBreakdown | null
}

function workflowFromReview(status: 'PENDING' | 'COMPLETED'): LabWorkflowStatus {
  return deriveLabWorkflowStatus({
    hasQuestionnaire: true,
    submittedAt: new Date().toISOString(),
    reviewStatus: status,
    requireReviewForComplete: true,
  })
}

export default function AdminStudentWorkPage() {
  useAdminPageHeader('Student work', true)

  const [filter, setFilter] = useState<Filter>('ALL')
  const [rows, setRows] = useState<SubmissionListRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [viewRow, setViewRow] = useState<SubmissionDetail | null>(null)
  const [viewLoading, setViewLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filter !== 'ALL') params.set('status', filter)
      params.set('pageSize', '50')
      const res = await fetch(`/api/admin/student-work?${params}`)
      if (!res.ok) return
      const data = await res.json()
      setRows(Array.isArray(data.items) ? data.items : [])
      setTotal(typeof data.total === 'number' ? data.total : 0)
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    queueMicrotask(() => {
      void load()
    })
  }, [load])

  async function openView(row: SubmissionListRow) {
    setViewLoading(true)
    setViewRow(null)
    try {
      const res = await fetch(`/api/admin/student-work/${row.id}`)
      if (res.ok) {
        setViewRow((await res.json()) as SubmissionDetail)
      }
    } finally {
      setViewLoading(false)
    }
  }

  async function markAcknowledged(id: string) {
    setBusyId(id)
    try {
      const res = await fetch(`/api/admin/student-work/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewStatus: 'COMPLETED' }),
      })
      if (res.ok) {
        setViewRow(null)
        await load()
      }
    } finally {
      setBusyId(null)
    }
  }

  const filters: { key: Filter; label: string }[] = [
    { key: 'ALL', label: 'All' },
    { key: 'PENDING', label: 'Not yet viewed' },
    { key: 'COMPLETED', label: 'Acknowledged' },
  ]

  const pendingCount = filter === 'PENDING' ? total : 0

  return (
    <div>
      <div className="mb-6">
        <p className="max-w-2xl text-sm text-slate-500">
          View student pre-lab briefing submissions (scenario, materials, and task). These
          are not graded and students do not write anything — read-only context before VR.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cn(
                'rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
                filter === f.key
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-200 bg-slate-50/90 hover:bg-slate-50/90">
              <TableHead className="pl-6 font-semibold text-slate-600">Student</TableHead>
              <TableHead className="font-semibold text-slate-600">Experiment</TableHead>
              <TableHead className="font-semibold text-slate-600">Submitted</TableHead>
              <TableHead className="font-semibold text-slate-600">Status</TableHead>
              <TableHead className="pr-6 text-right font-semibold text-slate-600">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-slate-500">
                  Loading submissions…
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-slate-500">
                  {filter === 'PENDING'
                    ? 'No submissions awaiting acknowledgement.'
                    : 'No submissions in this view.'}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id} className="border-slate-100">
                  <TableCell className="pl-6">
                    <p className="font-medium text-slate-900">{r.student.name}</p>
                    <p className="text-xs text-slate-500">{r.student.email}</p>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium text-slate-800">{r.experiment.title}</p>
                    {r.experiment.subject ? (
                      <p className="font-mono text-xs text-slate-500">
                        {r.experiment.subject.code}
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">
                    {new Date(r.submittedAt).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <LabWorkflowStatusBadge
                      status={workflowFromReview(r.reviewStatus)}
                    />
                  </TableCell>
                  <TableCell className="pr-6 text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="text-blue-600 hover:bg-blue-50"
                        title="View submission"
                        aria-label="View submission"
                        onClick={() => void openView(r)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {r.reviewStatus === 'PENDING' ? (
                        <Button
                          type="button"
                          size="sm"
                          className="rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                          disabled={busyId === r.id}
                          onClick={() => void markAcknowledged(r.id)}
                        >
                          {busyId === r.id ? 'Saving…' : 'Acknowledge'}
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {filter === 'PENDING' && pendingCount > 0 ? (
        <p className="mt-3 text-sm text-amber-700">
          {pendingCount} submission{pendingCount === 1 ? '' : 's'} not yet acknowledged.
        </p>
      ) : null}

      <Dialog
        open={viewLoading || !!viewRow}
        onOpenChange={(o) => {
          if (!o) setViewRow(null)
        }}
      >
        <DialogContent className="max-h-[90vh] w-full max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-4xl sm:p-6">
          <DialogHeader>
            <DialogTitle>
              {viewRow
                ? `${viewRow.student.name} — ${viewRow.experiment.title}`
                : 'Loading submission…'}
            </DialogTitle>
          </DialogHeader>
          {viewLoading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : viewRow?.config ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-500">
                Pre-lab briefing (not graded). Read-only context the student viewed before VR.
              </p>
              <QuestionnaireReviewCard
                config={viewRow.config}
                answers={viewRow.answers}
                workflowStatus={workflowFromReview(viewRow.reviewStatus)}
                showFooter={false}
                contextOnly
              />
              {viewRow.gradeBreakdown ? (
                <GradeBreakdown
                  breakdown={viewRow.gradeBreakdown}
                  title="Student grade progress (quiz & report)"
                />
              ) : null}
            </div>
          ) : viewRow ? (
            <p className="text-sm text-slate-500">Questionnaire configuration unavailable.</p>
          ) : null}
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setViewRow(null)}>
              Close
            </Button>
            {viewRow && viewRow.reviewStatus !== 'COMPLETED' ? (
              <Button
                type="button"
                className="bg-emerald-600 text-white hover:bg-emerald-700"
                disabled={busyId === viewRow.id}
                onClick={() => void markAcknowledged(viewRow.id)}
              >
                Acknowledge
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
