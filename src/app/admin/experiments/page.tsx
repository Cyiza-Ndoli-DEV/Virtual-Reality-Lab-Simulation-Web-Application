'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ClipboardList, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAdminPageHeader } from '@/components/admin/admin-app-header-context'

type SubjectStatus = 'ACTIVE' | 'INACTIVE'

interface SubjectOption {
  id: string
  code: string
  name: string
  status: SubjectStatus
}

interface ExperimentRow {
  id: string
  title: string
  description: string
  learningOutcome: string
  createdAt: string
  subjectId: string | null
  subject: { id: string; code: string; name: string; status: SubjectStatus } | null
}

export default function AdminExperimentsPage() {
  const router = useRouter()
  useAdminPageHeader('Experiments', true)

  const [rows, setRows] = useState<ExperimentRow[]>([])
  const [subjects, setSubjects] = useState<SubjectOption[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const [addOpen, setAddOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [learningOutcome, setLearningOutcome] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [addBusy, setAddBusy] = useState(false)
  const [addError, setAddError] = useState('')

  const [editRow, setEditRow] = useState<ExperimentRow | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editLearningOutcome, setEditLearningOutcome] = useState('')
  const [editSubjectId, setEditSubjectId] = useState('')
  const [editBusy, setEditBusy] = useState(false)
  const [editError, setEditError] = useState('')

  const [deleteRow, setDeleteRow] = useState<ExperimentRow | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const loadSubjects = useCallback(async () => {
    const res = await fetch('/api/admin/settings/subjects')
    if (!res.ok) return
    const data = await res.json()
    setSubjects(Array.isArray(data) ? data : [])
  }, [])

  const loadExperiments = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/experiments')
      if (!res.ok) return
      const data = await res.json()
      setRows(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }, [])

  const load = useCallback(async () => {
    await Promise.all([loadSubjects(), loadExperiments()])
  }, [loadSubjects, loadExperiments])

  useEffect(() => {
    queueMicrotask(() => {
      void load()
    })
  }, [load])

  const subjectChoices = useMemo(() => {
    const active = subjects.filter((s) => s.status === 'ACTIVE')
    if (active.length > 0) return active
    return subjects
  }, [subjects])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => {
      const sub = r.subject ? `${r.subject.code} ${r.subject.name}` : ''
      const blob = `${r.title} ${r.description} ${r.learningOutcome} ${sub}`.toLowerCase()
      return blob.includes(q)
    })
  }, [rows, search])

  function openEdit(r: ExperimentRow) {
    setEditError('')
    setEditRow(r)
    setEditTitle(r.title)
    setEditDescription(r.description)
    setEditLearningOutcome(r.learningOutcome)
    const fallback =
      r.subjectId ??
      subjects.find((s) => s.status === 'ACTIVE')?.id ??
      subjects[0]?.id ??
      ''
    setEditSubjectId(fallback)
  }

  async function submitAdd() {
    setAddError('')
    setAddBusy(true)
    try {
      const res = await fetch('/api/admin/experiments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          learningOutcome,
          subjectId,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setAddError(data.error || 'Could not create experiment')
        return
      }
      setAddOpen(false)
      setTitle('')
      setDescription('')
      setLearningOutcome('')
      setSubjectId('')
      await load()
    } finally {
      setAddBusy(false)
    }
  }

  async function saveEdit() {
    if (!editRow) return
    const sid = editSubjectId.trim()
    if (!sid) {
      setEditError('Please select a subject')
      return
    }
    setEditError('')
    setEditBusy(true)
    try {
      const res = await fetch(`/api/admin/experiments/${editRow.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle,
          description: editDescription,
          learningOutcome: editLearningOutcome,
          subjectId: sid,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setEditError(data.error || 'Could not update experiment')
        return
      }
      setEditRow(null)
      await load()
    } finally {
      setEditBusy(false)
    }
  }

  async function confirmDelete() {
    if (!deleteRow) return
    setDeleteError('')
    setDeleteBusy(true)
    try {
      const res = await fetch(`/api/admin/experiments/${deleteRow.id}`, {
        method: 'DELETE',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setDeleteError(data.error || 'Could not delete experiment')
        return
      }
      setDeleteRow(null)
      await load()
    } finally {
      setDeleteBusy(false)
    }
  }

  function subjectSelectOptions() {
    return [...subjects].sort((a, b) => a.code.localeCompare(b.code))
  }

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Experiments
        </p>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          Create and manage VR lab experiments. Link each experiment to a subject and define what
          learners should achieve.
        </p>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="relative min-w-0 flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, subject, description, or learning outcomes…"
            className="h-10 rounded-xl border-slate-200 bg-slate-50/80 pl-9 text-sm shadow-none"
            aria-label="Search experiments"
          />
        </div>
        <Button
          type="button"
          className="h-10 shrink-0 self-end rounded-xl bg-blue-600 text-white hover:bg-blue-700 sm:self-auto"
          onClick={() => {
            setAddError('')
            setSubjectId(subjectChoices[0]?.id ?? '')
            setAddOpen(true)
          }}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Add experiment
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-200 bg-slate-50/90 hover:bg-slate-50/90">
              <TableHead className="pl-6 font-semibold text-slate-600">Title</TableHead>
              <TableHead className="font-semibold text-slate-600">Subject</TableHead>
              <TableHead className="font-semibold text-slate-600">Description</TableHead>
              <TableHead className="font-semibold text-slate-600">Learning outcomes</TableHead>
              <TableHead className="w-[7.5rem] pr-6 text-right font-semibold text-slate-600">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-slate-500">
                  Loading experiments…
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-slate-500">
                  {rows.length === 0
                    ? 'No experiments yet. Add one with the button above.'
                    : 'No experiments match your search.'}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => (
                <TableRow key={r.id} className="border-slate-100">
                  <TableCell className="pl-6 font-medium text-slate-900">{r.title}</TableCell>
                  <TableCell className="text-slate-700">
                    {r.subject ? (
                      <span className="text-sm">
                        <span className="font-mono font-medium text-slate-900">{r.subject.code}</span>
                        <span className="text-slate-500"> · {r.subject.name}</span>
                      </span>
                    ) : (
                      <span className="text-sm text-slate-400">—</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-xs text-slate-600">
                    <span className="line-clamp-2 text-sm">{r.description}</span>
                  </TableCell>
                  <TableCell className="max-w-xs text-slate-600">
                    <span className="line-clamp-2 text-sm">{r.learningOutcome}</span>
                  </TableCell>
                  <TableCell className="pr-6 text-right">
                    <div className="flex items-center justify-end gap-0.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="text-violet-600 hover:bg-violet-50 hover:text-violet-700"
                        aria-label={`Questionnaire setup for ${r.title}`}
                        onClick={() => router.push(`/admin/experiments/${r.id}/questionnaire`)}
                      >
                        <ClipboardList className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                        aria-label={`Edit ${r.title}`}
                        onClick={() => openEdit(r)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        aria-label={`Delete ${r.title}`}
                        onClick={() => {
                          setDeleteError('')
                          setDeleteRow(r)
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg sm:max-w-lg" showCloseButton>
          <DialogHeader>
            <DialogTitle>Add experiment</DialogTitle>
            <DialogDescription>
              New experiments start with a default single VR step; you can extend step data later
              if needed.
            </DialogDescription>
          </DialogHeader>
          <div className="grid max-h-[min(70vh,520px)] gap-3 overflow-y-auto py-2 pr-1">
            <div className="grid gap-1.5">
              <Label htmlFor="exp-title">Title</Label>
              <Input
                id="exp-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Acid–base titration"
                className="h-10"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="exp-subject">Subject</Label>
              <select
                id="exp-subject"
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm"
                disabled={subjects.length === 0}
              >
                {subjects.length === 0 ? (
                  <option value="">No subjects — add subjects in Settings first</option>
                ) : (
                  subjectSelectOptions().map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} — {s.name}
                      {s.status !== 'ACTIVE' ? ' (inactive)' : ''}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="exp-desc">Description</Label>
              <Textarea
                id="exp-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What students do in the lab simulation…"
                rows={3}
                className="min-h-[80px] resize-y"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="exp-lo">Learning outcomes</Label>
              <Textarea
                id="exp-lo"
                value={learningOutcome}
                onChange={(e) => setLearningOutcome(e.target.value)}
                placeholder="What learners should be able to do or explain after the practical…"
                rows={3}
                className="min-h-[80px] resize-y"
              />
            </div>
            {addError && <p className="text-sm text-red-600">{addError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-blue-600 text-white hover:bg-blue-700"
              disabled={addBusy || subjects.length === 0}
              onClick={() => void submitAdd()}
            >
              {addBusy ? 'Saving…' : 'Create experiment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editRow}
        onOpenChange={(o) => {
          if (!o) setEditRow(null)
        }}
      >
        <DialogContent className="max-w-lg sm:max-w-lg" showCloseButton>
          <DialogHeader>
            <DialogTitle>Edit experiment</DialogTitle>
            <DialogDescription>
              Update catalog text and subject. Step-by-step VR content is unchanged from this
              dialog.
            </DialogDescription>
          </DialogHeader>
          <div className="grid max-h-[min(70vh,520px)] gap-3 overflow-y-auto py-2 pr-1">
            <div className="grid gap-1.5">
              <Label htmlFor="edit-exp-title">Title</Label>
              <Input
                id="edit-exp-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="h-10"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="edit-exp-subject">Subject</Label>
              <select
                id="edit-exp-subject"
                value={editSubjectId}
                onChange={(e) => setEditSubjectId(e.target.value)}
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm"
                disabled={subjects.length === 0}
              >
                {subjects.length === 0 ? (
                  <option value="">No subjects</option>
                ) : (
                  subjectSelectOptions().map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} — {s.name}
                      {s.status !== 'ACTIVE' ? ' (inactive)' : ''}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="edit-exp-desc">Description</Label>
              <Textarea
                id="edit-exp-desc"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
                className="min-h-[80px] resize-y"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="edit-exp-lo">Learning outcomes</Label>
              <Textarea
                id="edit-exp-lo"
                value={editLearningOutcome}
                onChange={(e) => setEditLearningOutcome(e.target.value)}
                rows={3}
                className="min-h-[80px] resize-y"
              />
            </div>
            {editError && <p className="text-sm text-red-600">{editError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setEditRow(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-blue-600 text-white hover:bg-blue-700"
              disabled={editBusy || subjects.length === 0}
              onClick={() => void saveEdit()}
            >
              {editBusy ? 'Saving…' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deleteRow}
        onOpenChange={(o) => {
          if (!o) setDeleteRow(null)
        }}
      >
        <DialogContent className="max-w-md sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>Delete experiment</DialogTitle>
            <DialogDescription>
              {deleteRow ? (
                <>
                  This removes <span className="font-medium text-slate-900">{deleteRow.title}</span>{' '}
                  and related quizzes, questionnaires, sessions, and reports. This cannot be undone.
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          {deleteError && <p className="text-sm text-red-600">{deleteError}</p>}
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setDeleteRow(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={deleteBusy}
              onClick={() => void confirmDelete()}
            >
              {deleteBusy ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
