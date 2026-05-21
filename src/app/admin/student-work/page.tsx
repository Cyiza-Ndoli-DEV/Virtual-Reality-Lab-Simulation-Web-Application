'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
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
import type { LabWorkflowStatus } from '@/lib/lab-workflow-status'
import { cn } from '@/lib/utils'

type Filter = 'PENDING' | 'COMPLETED' | 'ALL'

interface SubmissionRow {
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
  answers: QuestionnaireAnswers
  config: QuestionnaireConfig | null
}

function workflowFromReview(status: 'PENDING' | 'COMPLETED'): LabWorkflowStatus {
  return status === 'COMPLETED' ? 'completed' : 'pending'
}

export default function AdminStudentWorkPage() {
  useAdminPageHeader('Student work', true)

  const [filter, setFilter] = useState<Filter>('PENDING')
  const [rows, setRows] = useState<SubmissionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [viewRow, setViewRow] = useState<SubmissionRow | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const q = filter === 'ALL' ? '' : `?status=${filter}`
      const res = await fetch(`/api/admin/student-work${q}`)
      if (!res.ok) return
      const data = await res.json()
      setRows(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    queueMicrotask(() => {
      void load()
    })
  }, [load])

  const pendingCount = useMemo(
    () => rows.filter((r) => r.reviewStatus === 'PENDING').length,
    [rows]
  )

  async function markComplete(id: string) {
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
    { key: 'PENDING', label: 'Pending review' },
    { key: 'COMPLETED', label: 'Completed' },
    { key: 'ALL', label: 'All' },
  ]

  return (
    <div>
      <div className="mb-6">
        <p className="max-w-2xl text-sm text-slate-500">
          Receive and review post-lab questionnaires from students. Mark work as completed
          when marking is finished so students see their lab status update.
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
                    ? 'No submissions awaiting review.'
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
                        aria-label="View submission"
                        onClick={() => setViewRow(r)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {r.reviewStatus === 'PENDING' ? (
                        <Button
                          type="button"
                          size="sm"
                          className="rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                          disabled={busyId === r.id}
                          onClick={() => void markComplete(r.id)}
                        >
                          {busyId === r.id ? 'Saving…' : 'Mark completed'}
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
          {pendingCount} submission{pendingCount === 1 ? '' : 's'} waiting for your review.
        </p>
      ) : null}

      <Dialog open={!!viewRow} onOpenChange={(o) => !o && setViewRow(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {viewRow?.student.name} — {viewRow?.experiment.title}
            </DialogTitle>
          </DialogHeader>
          {viewRow?.config ? (
            <QuestionnaireReviewCard
              config={viewRow.config}
              answers={viewRow.answers}
              workflowStatus={workflowFromReview(viewRow.reviewStatus)}
              showFooter={false}
            />
          ) : (
            <p className="text-sm text-slate-500">Questionnaire configuration unavailable.</p>
          )}
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setViewRow(null)}>
              Close
            </Button>
            {viewRow?.reviewStatus === 'PENDING' ? (
              <Button
                type="button"
                className="bg-emerald-600 text-white hover:bg-emerald-700"
                disabled={busyId === viewRow.id}
                onClick={() => void markComplete(viewRow.id)}
              >
                Mark completed
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
