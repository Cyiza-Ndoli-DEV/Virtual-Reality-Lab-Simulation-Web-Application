'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
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

interface SubjectRow {
  id: string
  code: string
  name: string
  status: SubjectStatus
  description: string | null
  createdAt: string
  updatedAt: string
}

function statusBadgeClass(status: SubjectStatus) {
  if (status === 'ACTIVE') return 'border-emerald-200/80 bg-emerald-50 text-emerald-800'
  return 'border-slate-200/80 bg-slate-100 text-slate-700'
}

function statusLabel(status: SubjectStatus) {
  return status === 'ACTIVE' ? 'Active' : 'Inactive'
}

export default function AdminSettingsSubjectsPage() {
  useAdminPageHeader('Subjects', false)

  const [rows, setRows] = useState<SubjectRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const [addOpen, setAddOpen] = useState(false)
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [addStatus, setAddStatus] = useState<SubjectStatus>('ACTIVE')
  const [addBusy, setAddBusy] = useState(false)
  const [addError, setAddError] = useState('')

  const [editRow, setEditRow] = useState<SubjectRow | null>(null)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editStatus, setEditStatus] = useState<SubjectStatus>('ACTIVE')
  const [editBusy, setEditBusy] = useState(false)
  const [editError, setEditError] = useState('')

  const [deleteRow, setDeleteRow] = useState<SubjectRow | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/settings/subjects')
      if (!res.ok) return
      const data = await res.json()
      setRows(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    queueMicrotask(() => {
      void load()
    })
  }, [load])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => {
      const blob = `${r.code} ${r.name} ${r.description ?? ''} ${r.status}`.toLowerCase()
      return blob.includes(q)
    })
  }, [rows, search])

  function openEdit(r: SubjectRow) {
    setEditError('')
    setEditRow(r)
    setEditName(r.name)
    setEditDescription(r.description ?? '')
    setEditStatus(r.status)
  }

  async function submitAdd() {
    setAddError('')
    setAddBusy(true)
    try {
      const res = await fetch('/api/admin/settings/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          name,
          description,
          status: addStatus,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setAddError(data.error || 'Could not create subject')
        return
      }
      setAddOpen(false)
      setCode('')
      setName('')
      setDescription('')
      setAddStatus('ACTIVE')
      await load()
    } finally {
      setAddBusy(false)
    }
  }

  async function saveEdit() {
    if (!editRow) return
    setEditError('')
    setEditBusy(true)
    try {
      const res = await fetch(`/api/admin/settings/subjects/${editRow.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          description: editDescription.trim() ? editDescription.trim() : null,
          status: editStatus,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setEditError(data.error || 'Could not update subject')
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
      const res = await fetch(`/api/admin/settings/subjects/${deleteRow.id}`, {
        method: 'DELETE',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setDeleteError(data.error || 'Could not delete subject')
        return
      }
      setDeleteRow(null)
      await load()
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Settings / Subjects
        </p>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          Maintain the catalog of subjects (course codes and titles) used across the platform.
        </p>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="relative min-w-0 flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by code, name, or description…"
            className="h-10 rounded-xl border-slate-200 bg-slate-50/80 pl-9 text-sm shadow-none"
            aria-label="Search subjects"
          />
        </div>
        <Button
          type="button"
          className="h-10 shrink-0 self-end rounded-xl bg-blue-600 text-white hover:bg-blue-700 sm:self-auto"
          onClick={() => {
            setAddError('')
            setAddOpen(true)
          }}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Add subject
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-200 bg-slate-50/90 hover:bg-slate-50/90">
              <TableHead className="pl-6 font-semibold text-slate-600">Subject code</TableHead>
              <TableHead className="font-semibold text-slate-600">Subject name</TableHead>
              <TableHead className="font-semibold text-slate-600">Status</TableHead>
              <TableHead className="font-semibold text-slate-600">Description</TableHead>
              <TableHead className="w-[7.5rem] pr-6 text-right font-semibold text-slate-600">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-slate-500">
                  Loading subjects…
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-slate-500">
                  {rows.length === 0
                    ? 'No subjects yet. Add one with the button above.'
                    : 'No subjects match your search.'}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => (
                <TableRow key={r.id} className="border-slate-100">
                  <TableCell className="pl-6">
                    <span className="font-mono text-sm font-medium text-slate-900">{r.code}</span>
                  </TableCell>
                  <TableCell className="font-medium text-slate-900">{r.name}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`rounded-full font-medium ${statusBadgeClass(r.status)}`}
                    >
                      {statusLabel(r.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-md text-slate-600">
                    <span className="line-clamp-2 text-sm">{r.description || '—'}</span>
                  </TableCell>
                  <TableCell className="pr-6 text-right">
                    <div className="flex items-center justify-end gap-0.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                        aria-label={`Edit ${r.name}`}
                        onClick={() => openEdit(r)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        aria-label={`Delete ${r.name}`}
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
        <DialogContent className="max-w-md sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>Add subject</DialogTitle>
            <DialogDescription>
              Codes are normalized to uppercase (e.g. CHEM-101). Subject codes must be unique.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="subject-code">Subject code</Label>
              <Input
                id="subject-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. PHY-101"
                className="h-10 font-mono"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="subject-name">Subject name</Label>
              <Input
                id="subject-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. General Physics I"
                className="h-10"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="subject-status">Status</Label>
              <select
                id="subject-status"
                value={addStatus}
                onChange={(e) => setAddStatus(e.target.value as SubjectStatus)}
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm"
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="subject-desc">Description (optional)</Label>
              <Textarea
                id="subject-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief summary for catalogs…"
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
              disabled={addBusy}
              onClick={() => void submitAdd()}
            >
              {addBusy ? 'Saving…' : 'Create subject'}
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
        <DialogContent className="max-w-md sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>Edit subject</DialogTitle>
            <DialogDescription>
              {editRow ? (
                <>
                  Update <span className="font-mono font-medium">{editRow.code}</span>. The code
                  cannot be changed here; create a new subject if the code was entered incorrectly.
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="edit-subject-name">Subject name</Label>
              <Input
                id="edit-subject-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-10"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="edit-subject-status">Status</Label>
              <select
                id="edit-subject-status"
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as SubjectStatus)}
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm"
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="edit-subject-desc">Description</Label>
              <Textarea
                id="edit-subject-desc"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
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
              disabled={editBusy}
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
            <DialogTitle>Delete subject</DialogTitle>
            <DialogDescription>
              {deleteRow ? (
                <>
                  This permanently removes{' '}
                  <span className="font-mono font-medium text-slate-900">{deleteRow.code}</span>
                  {' — '}
                  <span className="font-medium text-slate-900">{deleteRow.name}</span>. This cannot
                  be undone.
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
