'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { GraduationCap, Pencil, Search, Trash2, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { Label } from '@/components/ui/label'
import { useAdminPageHeader } from '@/components/admin/admin-app-header-context'

interface StudentRow {
  id: string
  name: string
  email: string
  username?: string | null
  role: string
  createdAt: string
  _count: { sessions: number }
}

function formatDate(d: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(d))
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export default function AdminStudentsPage() {
  useAdminPageHeader('Students', true)

  const [students, setStudents] = useState<StudentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const [addOpen, setAddOpen] = useState(false)
  const [addName, setAddName] = useState('')
  const [addEmail, setAddEmail] = useState('')
  const [addUsername, setAddUsername] = useState('')
  const [addPassword, setAddPassword] = useState('')
  const [addBusy, setAddBusy] = useState(false)
  const [addError, setAddError] = useState('')

  const [editRow, setEditRow] = useState<StudentRow | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editBusy, setEditBusy] = useState(false)
  const [editError, setEditError] = useState('')

  const [deleteRow, setDeleteRow] = useState<StudentRow | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/students')
      if (!res.ok) return
      const data = await res.json()
      setStudents(Array.isArray(data) ? data : [])
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
    if (!q) return students
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        (s.username?.toLowerCase().includes(q) ?? false)
    )
  }, [students, search])

  async function submitAdd() {
    setAddError('')
    setAddBusy(true)
    try {
      const res = await fetch('/api/admin/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: addName,
          email: addEmail,
          username: addUsername,
          password: addPassword,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setAddError(data.error || 'Could not register student')
        return
      }
      setAddOpen(false)
      setAddName('')
      setAddEmail('')
      setAddUsername('')
      setAddPassword('')
      await load()
    } finally {
      setAddBusy(false)
    }
  }

  async function submitEdit() {
    if (!editRow) return
    setEditError('')
    setEditBusy(true)
    try {
      const res = await fetch(`/api/admin/students/${editRow.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, email: editEmail }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setEditError(data.error || 'Could not update student')
        return
      }
      setEditRow(null)
      await load()
    } finally {
      setEditBusy(false)
    }
  }

  function openRegisterDialog() {
    setAddError('')
    setAddName('')
    setAddEmail('')
    setAddUsername('')
    setAddPassword('')
    setAddOpen(true)
  }

  function handleRegisterDialogOpen(open: boolean) {
    setAddOpen(open)
    if (!open) {
      setAddName('')
      setAddEmail('')
      setAddUsername('')
      setAddPassword('')
      setAddError('')
    }
  }

  async function confirmDelete() {
    if (!deleteRow) return
    setDeleteError('')
    setDeleteBusy(true)
    try {
      const res = await fetch(`/api/admin/students/${deleteRow.id}`, {
        method: 'DELETE',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setDeleteError(data.error || 'Could not delete student')
        return
      }
      setDeleteRow(null)
      await load()
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="max-w-2xl text-sm text-slate-500">
          Register and manage student accounts. Educators can only add users with the
          Student role — teachers and admins are created by system administrators.
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search students by name or email…"
            className="h-10 rounded-xl border-slate-200 bg-slate-50/80 pl-9"
          />
        </div>
        <Button
          type="button"
          className="h-10 rounded-xl bg-slate-900 text-white hover:bg-slate-800"
          onClick={openRegisterDialog}
        >
          <UserPlus className="mr-1.5 h-4 w-4" />
          Register student
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-200 bg-slate-50/90 hover:bg-slate-50/90">
              <TableHead className="pl-6 font-semibold text-slate-600">Student</TableHead>
              <TableHead className="font-semibold text-slate-600">Email</TableHead>
              <TableHead className="font-semibold text-slate-600">Username</TableHead>
              <TableHead className="font-semibold text-slate-600">Lab sessions</TableHead>
              <TableHead className="font-semibold text-slate-600">Registered</TableHead>
              <TableHead className="pr-6 text-right font-semibold text-slate-600">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-slate-500">
                  Loading students…
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-slate-500">
                  No students found. Register your first student to get started.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((s) => (
                <TableRow key={s.id} className="border-slate-100">
                  <TableCell className="pl-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500 text-xs font-bold text-white">
                        {initials(s.name)}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{s.name}</p>
                        <Badge
                          variant="outline"
                          className="mt-0.5 border-sky-200 bg-sky-50 text-sky-800"
                        >
                          Student
                        </Badge>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-600">{s.email}</TableCell>
                  <TableCell className="font-mono text-sm text-slate-600">
                    {s.username ?? '—'}
                  </TableCell>
                  <TableCell className="text-slate-600">{s._count.sessions}</TableCell>
                  <TableCell className="text-slate-600">
                    {formatDate(s.createdAt)}
                  </TableCell>
                  <TableCell className="pr-6 text-right">
                    <div className="inline-flex gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="text-blue-600 hover:bg-blue-50"
                        aria-label={`Edit ${s.name}`}
                        onClick={() => {
                          setEditError('')
                          setEditRow(s)
                          setEditName(s.name)
                          setEditEmail(s.email)
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="text-red-600 hover:bg-red-50"
                        aria-label={`Delete ${s.name}`}
                        onClick={() => {
                          setDeleteError('')
                          setDeleteRow(s)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={addOpen} onOpenChange={handleRegisterDialogOpen}>
        <DialogContent className="max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-sky-600" />
              Register student
            </DialogTitle>
            <DialogDescription>
              Creates a student account with a unique username and temporary password. The student
              must change the password on first sign-in.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="stu-name">Full name</Label>
              <Input
                id="stu-name"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="e.g. Jane Student"
                autoComplete="off"
                className="h-10"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="stu-email">Email</Label>
              <Input
                id="stu-email"
                type="email"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                placeholder="e.g. student@school.ug"
                autoComplete="off"
                className="h-10"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="stu-username">Username</Label>
              <Input
                id="stu-username"
                value={addUsername}
                onChange={(e) => setAddUsername(e.target.value)}
                placeholder="e.g. jstudent"
                autoComplete="off"
                className="h-10 font-mono"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="stu-pass">Temporary password</Label>
              <Input
                id="stu-pass"
                type="password"
                value={addPassword}
                onChange={(e) => setAddPassword(e.target.value)}
                placeholder="Choose a temporary password"
                autoComplete="new-password"
                className="h-10"
              />
            </div>
            {addError ? <p className="text-sm text-red-600">{addError}</p> : null}
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-slate-900 text-white hover:bg-slate-800"
              disabled={addBusy}
              onClick={() => void submitAdd()}
            >
              {addBusy ? 'Registering…' : 'Register student'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editRow} onOpenChange={(o) => !o && setEditRow(null)}>
        <DialogContent className="max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>Edit student</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="edit-stu-name">Name</Label>
              <Input
                id="edit-stu-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-10"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="edit-stu-email">Email</Label>
              <Input
                id="edit-stu-email"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="h-10"
              />
            </div>
            {editError ? <p className="text-sm text-red-600">{editError}</p> : null}
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setEditRow(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-slate-900 text-white hover:bg-slate-800"
              disabled={editBusy}
              onClick={() => void submitEdit()}
            >
              {editBusy ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteRow} onOpenChange={(o) => !o && setDeleteRow(null)}>
        <DialogContent className="max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>Remove student?</DialogTitle>
            <DialogDescription>
              {deleteRow ? (
                <>
                  Permanently remove <strong>{deleteRow.name}</strong> ({deleteRow.email}).
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          {deleteError ? <p className="text-sm text-red-600">{deleteError}</p> : null}
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setDeleteRow(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteBusy}
              onClick={() => void confirmDelete()}
            >
              {deleteBusy ? 'Removing…' : 'Remove student'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
