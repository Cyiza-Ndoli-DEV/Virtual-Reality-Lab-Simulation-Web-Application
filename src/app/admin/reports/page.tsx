'use client'

import { useCallback, useEffect, useState } from 'react'
import { Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useAdminPageHeader } from '@/components/admin/admin-app-header-context'
import { LabWorkflowStatusBadge } from '@/components/student/lab-workflow-status-badge'
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
import type { LabWorkflowStatus } from '@/lib/lab-workflow-status'
import { cn } from '@/lib/utils'

type Filter = 'PENDING' | 'COMPLETED' | 'ALL'

interface ReportListRow {
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
  assignmentTitle: string
}

interface ReportDetail extends ReportListRow {
  content: string
  teacherFeedback: string | null
  assignment: { title: string; instructions: string }
  vrSession: {
    timeTaken: number
    wrongSteps: number
    passed: boolean
    completedAt: string | null
  } | null
}

function workflowFromReview(status: 'PENDING' | 'COMPLETED'): LabWorkflowStatus {
  return status === 'COMPLETED' ? 'completed' : 'pending'
}

export default function AdminReportsPage() {
  useAdminPageHeader('Lab reports', true)

  const [filter, setFilter] = useState<Filter>('ALL')
  const [rows, setRows] = useState<ReportListRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [viewRow, setViewRow] = useState<ReportDetail | null>(null)
  const [viewLoading, setViewLoading] = useState(false)
  const [feedback, setFeedback] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filter !== 'ALL') params.set('status', filter)
      params.set('pageSize', '50')
      const res = await fetch(`/api/admin/reports?${params}`)
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

  async function openView(row: ReportListRow) {
    setViewLoading(true)
    setViewRow(null)
    setFeedback('')
    try {
      const res = await fetch(`/api/admin/reports/${row.id}`)
      if (res.ok) {
        const detail = (await res.json()) as ReportDetail
        setViewRow(detail)
        setFeedback(detail.teacherFeedback ?? '')
      }
    } finally {
      setViewLoading(false)
    }
  }

  async function markComplete(id: string) {
    setBusyId(id)
    try {
      const res = await fetch(`/api/admin/reports/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewStatus: 'COMPLETED',
          teacherFeedback: feedback.trim() || null,
        }),
      })
      if (res.ok) {
        setViewRow(null)
        await load()
      }
    } finally {
      setBusyId(null)
    }
  }

  async function saveFeedbackOnly(id: string) {
    setBusyId(id)
    try {
      const res = await fetch(`/api/admin/reports/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherFeedback: feedback.trim() || null }),
      })
      if (res.ok) {
        await openView({ ...viewRow!, id } as ReportListRow)
        await load()
      }
    } finally {
      setBusyId(null)
    }
  }

  const filters: { key: Filter; label: string }[] = [
    { key: 'ALL', label: 'All' },
    { key: 'PENDING', label: 'Pending review' },
    { key: 'COMPLETED', label: 'Completed' },
  ]

  return (
    <div>
      <div className="mb-6">
        <p className="max-w-2xl text-sm text-slate-500">
          Review written lab reports students submit after completing VR practicals. Add
          report assignments per experiment from the Experiments page (document icon).
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
            <TableRow className="border-slate-100 bg-slate-50/80 hover:bg-slate-50/80">
              <TableHead className="pl-6 text-slate-600">Student</TableHead>
              <TableHead className="text-slate-600">Experiment</TableHead>
              <TableHead className="text-slate-600">Report</TableHead>
              <TableHead className="text-slate-600">Submitted</TableHead>
              <TableHead className="text-slate-600">Status</TableHead>
              <TableHead className="pr-6 text-right text-slate-600">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-slate-500">
                  Loading reports…
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-slate-500">
                  {filter === 'PENDING'
                    ? 'No reports awaiting review.'
                    : 'No lab reports match this filter.'}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id} className="border-slate-100">
                  <TableCell className="pl-6">
                    <p className="font-medium text-slate-900">{r.student.name}</p>
                    <p className="text-xs text-slate-500">{r.student.email}</p>
                  </TableCell>
                  <TableCell className="text-slate-700">
                    <p className="font-medium">{r.experiment.title}</p>
                    {r.experiment.subject ? (
                      <p className="text-xs text-slate-500">{r.experiment.subject.code}</p>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">{r.assignmentTitle}</TableCell>
                  <TableCell className="text-sm text-slate-600">
                    {new Date(r.submittedAt).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <LabWorkflowStatusBadge
                      status={workflowFromReview(r.reviewStatus)}
                    />
                  </TableCell>
                  <TableCell className="pr-6 text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-blue-600"
                      onClick={() => void openView(r)}
                    >
                      <Eye className="mr-1 h-4 w-4" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {!loading && rows.length > 0 ? (
          <p className="border-t border-slate-100 px-6 py-3 text-xs text-slate-500">
            Showing {rows.length} of {total} report{total === 1 ? '' : 's'}
          </p>
        ) : null}
      </div>

      <Dialog open={Boolean(viewRow) || viewLoading} onOpenChange={(o) => !o && setViewRow(null)}>
        <DialogContent className="max-h-[90vh] w-full max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-4xl sm:p-6">
          <DialogHeader>
            <DialogTitle>
              {viewLoading
                ? 'Loading…'
                : viewRow
                  ? `${viewRow.student.name} — ${viewRow.experiment.title}`
                  : 'Report'}
            </DialogTitle>
          </DialogHeader>
          {viewRow ? (
            <div className="space-y-4 text-sm">
              <LabWorkflowStatusBadge
                status={workflowFromReview(viewRow.reviewStatus)}
              />
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">Assignment</p>
                <p className="mt-1 font-medium text-slate-900">{viewRow.assignment.title}</p>
                <p className="mt-2 whitespace-pre-wrap text-slate-600">
                  {viewRow.assignment.instructions}
                </p>
              </div>
              {viewRow.vrSession ? (
                <dl className="grid grid-cols-3 gap-2 rounded-lg border border-slate-200 p-3 text-xs">
                  <div>
                    <dt className="text-slate-500">VR time</dt>
                    <dd className="font-medium">{viewRow.vrSession.timeTaken}s</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Wrong steps</dt>
                    <dd className="font-medium">{viewRow.vrSession.wrongSteps}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Passed</dt>
                    <dd className="font-medium">
                      {viewRow.vrSession.passed ? 'Yes' : 'No'}
                    </dd>
                  </div>
                </dl>
              ) : null}
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="font-medium text-slate-900">Student report</p>
                <p className="mt-3 whitespace-pre-wrap leading-relaxed text-slate-700">
                  {viewRow.content}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="teacher-feedback">Feedback (optional)</Label>
                <Textarea
                  id="teacher-feedback"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="min-h-24"
                  placeholder="Comments for the student…"
                  disabled={viewRow.reviewStatus === 'COMPLETED'}
                />
              </div>
            </div>
          ) : null}
          <DialogFooter className="gap-2 sm:gap-2">
            {viewRow && viewRow.reviewStatus !== 'COMPLETED' ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busyId === viewRow.id}
                  onClick={() => void saveFeedbackOnly(viewRow.id)}
                >
                  Save feedback
                </Button>
                <Button
                  type="button"
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={busyId === viewRow.id}
                  onClick={() => void markComplete(viewRow.id)}
                >
                  {busyId === viewRow.id ? 'Saving…' : 'Mark reviewed'}
                </Button>
              </>
            ) : (
              <Button type="button" variant="outline" onClick={() => setViewRow(null)}>
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
