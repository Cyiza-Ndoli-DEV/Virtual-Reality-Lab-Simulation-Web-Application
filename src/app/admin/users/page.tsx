'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Pencil,
  Search,
  Trash2,
  UserPlus,
  Users,
  Zap,
  Clock,
} from 'lucide-react'
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
import { cn } from '@/lib/utils'
import { useAdminPageHeader } from '@/components/admin/admin-app-header-context'

interface SubjectOption {
  id: string
  code: string
  name: string
  status: string
}

interface UserRow {
  id: string
  name: string
  email: string
  /** Matches `RoleDefinition.code`. */
  role: string
  subjectId?: string | null
  subject?: { id: string; code: string; name: string } | null
  createdAt: string
  _count: { sessions: number }
}

interface StatsPayload {
  totalUsers: number
  activeNow: number
  vrUsageHours: number
}

interface ActivityRow {
  id: string
  at: string
  userName: string
  userEmail: string
  userRole: string
  experimentTitle: string
  status: 'In progress' | 'Completed' | 'Ended'
}

const PAGE_SIZE = 10

function formatNumber(n: number) {
  return new Intl.NumberFormat('en-US').format(n)
}

function formatDate(d: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(d))
}

function formatDateTime(d: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
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

/** When the roles API is unavailable, labels for the built-in codes only. */
function roleLabelFallback(code: string) {
  if (code === 'TEACHER') return 'Educator'
  if (code === 'ADMIN') return 'Admin'
  if (code === 'STUDENT') return 'Student'
  return code
}

function roleBadgeClass(role: string) {
  if (role === 'STUDENT') return 'bg-sky-100 text-sky-800 border-sky-200/80'
  if (role === 'TEACHER') return 'bg-blue-100 text-blue-800 border-blue-200/80'
  if (role === 'ADMIN') return 'bg-indigo-100 text-indigo-900 border-indigo-200/80'
  return 'bg-slate-100 text-slate-800 border-slate-200/80'
}

function profileSubtitle(u: UserRow) {
  if (u.role === 'STUDENT') {
    const lvl = Math.max(1, Math.min(99, Math.floor(u._count.sessions / 2) + 1))
    return `Lvl ${lvl} Practitioner`
  }
  if (u.role === 'TEACHER') {
    return u.subject ? `${u.subject.code} · ${u.subject.name}` : 'Educator'
  }
  if (u.role === 'ADMIN') return 'Superuser'
  return 'Member'
}

export default function AdminUsersPage() {
  useAdminPageHeader('User Management', true)

  const [tab, setTab] = useState<'overview' | 'activity'>('overview')
  const [users, setUsers] = useState<UserRow[]>([])
  const [activity, setActivity] = useState<ActivityRow[]>([])
  const [stats, setStats] = useState<StatsPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  /** Role catalog from `/api/admin/settings/roles` (names + order for assignable enum roles). */
  const [roleDefinitions, setRoleDefinitions] = useState<{ code: string; name: string }[]>([])
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [page, setPage] = useState(1)

  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [invitePassword, setInvitePassword] = useState('')
  const [inviteRole, setInviteRole] = useState('STUDENT')
  const [inviteSubjectId, setInviteSubjectId] = useState('')
  const [inviteBusy, setInviteBusy] = useState(false)
  const [inviteError, setInviteError] = useState('')

  const [subjects, setSubjects] = useState<SubjectOption[]>([])

  const [viewUser, setViewUser] = useState<UserRow | null>(null)

  const [editUser, setEditUser] = useState<UserRow | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editRole, setEditRole] = useState('STUDENT')
  const [editSubjectId, setEditSubjectId] = useState('')
  const [editBusy, setEditBusy] = useState(false)
  const [editError, setEditError] = useState('')

  const activeSubjects = useMemo(
    () => subjects.filter((s) => s.status === 'ACTIVE'),
    [subjects]
  )

  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const userRoleOptions = useMemo(() => {
    if (roleDefinitions.length > 0) {
      return roleDefinitions.map((d) => ({ code: d.code, name: d.name }))
    }
    return ['ADMIN', 'TEACHER', 'STUDENT'].map((code) => ({
      code,
      name: roleLabelFallback(code),
    }))
  }, [roleDefinitions])

  const filterRoleOptions = useMemo(() => {
    const base = userRoleOptions
    const seen = new Set(base.map((o) => o.code))
    const extra: { code: string; name: string }[] = []
    for (const u of users) {
      if (!seen.has(u.role)) {
        seen.add(u.role)
        extra.push({ code: u.role, name: roleLabelFallback(u.role) })
      }
    }
    return [...base, ...extra]
  }, [userRoleOptions, users])

  const displayRoleName = useCallback(
    (code: string) => {
      const row = roleDefinitions.find((d) => d.code === code)
      return row?.name ?? roleLabelFallback(code)
    },
    [roleDefinitions]
  )

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [uRes, sRes, aRes, rolesRes, subRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/admin/stats'),
        fetch('/api/admin/activity'),
        fetch('/api/admin/settings/roles'),
        fetch('/api/admin/settings/subjects'),
      ])
      if (uRes.ok) {
        const data = await uRes.json()
        setUsers(Array.isArray(data) ? data : [])
      }
      if (sRes.ok) {
        const s = await sRes.json()
        setStats({
          totalUsers: s.totalUsers ?? 0,
          activeNow: s.activeNow ?? 0,
          vrUsageHours: s.vrUsageHours ?? 0,
        })
      }
      if (aRes.ok) {
        const a = await aRes.json()
        setActivity(Array.isArray(a) ? a : [])
      }
      if (rolesRes.ok) {
        const defs = await rolesRes.json()
        if (Array.isArray(defs)) {
          setRoleDefinitions(
            defs.map((d: { code: string; name: string }) => ({
              code: d.code,
              name: d.name,
            }))
          )
        }
      }
      if (subRes.ok) {
        const subs = await subRes.json()
        setSubjects(Array.isArray(subs) ? subs : [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loadData is async; state updates run after awaits
    void loadData()
  }, [loadData])

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase()
    return users.filter((u) => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false
      if (statusFilter !== 'all') {
        // Schema has no account status; placeholder filter keeps UI parity
        if (statusFilter === 'inactive' || statusFilter === 'pending') return false
      }
      if (!q) return true
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
      )
    })
  }, [users, search, roleFilter, statusFilter])

  const totalFiltered = filteredUsers.length
  const pageCount = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE))
  /** Clamped so filters never leave pagination on an empty page */
  const safePage = Math.min(page, pageCount)
  const pageSlice = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE
    return filteredUsers.slice(start, start + PAGE_SIZE)
  }, [filteredUsers, safePage])

  function exportCsv() {
    const rows = [
      ['Name', 'Email', 'Role', 'Date created'].join(','),
      ...filteredUsers.map((u) =>
        [
          JSON.stringify(u.name),
          JSON.stringify(u.email),
          JSON.stringify(displayRoleName(u.role)),
          u.createdAt,
        ].join(',')
      ),
    ]
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'users-export.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function submitInvite() {
    setInviteError('')
    if (inviteRole === 'TEACHER' && !inviteSubjectId) {
      setInviteError('Select a subject for this educator')
      return
    }
    setInviteBusy(true)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: inviteName,
          email: inviteEmail,
          password: invitePassword,
          role: inviteRole,
          ...(inviteRole === 'TEACHER' ? { subjectId: inviteSubjectId } : {}),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setInviteError(data.error || 'Could not create user')
        return
      }
      setInviteOpen(false)
      setInviteName('')
      setInviteEmail('')
      setInvitePassword('')
      setInviteRole(
        (userRoleOptions.find((o) => o.code === 'STUDENT') ?? userRoleOptions[0])?.code ??
          'STUDENT'
      )
      setInviteSubjectId('')
      await loadData()
    } finally {
      setInviteBusy(false)
    }
  }

  function openEdit(u: UserRow) {
    setEditError('')
    setEditUser(u)
    setEditName(u.name)
    setEditEmail(u.email)
    setEditRole(u.role)
    setEditSubjectId(u.subjectId ?? '')
  }

  async function submitEdit() {
    if (!editUser) return
    setEditError('')
    if (editRole === 'TEACHER' && !editSubjectId) {
      setEditError('Select a subject for this educator')
      return
    }
    setEditBusy(true)
    try {
      const res = await fetch(`/api/admin/users/${editUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          email: editEmail,
          role: editRole,
          ...(editRole === 'TEACHER' ? { subjectId: editSubjectId } : {}),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setEditError(data.error || 'Could not update user')
        return
      }
      setEditUser(null)
      await loadData()
    } finally {
      setEditBusy(false)
    }
  }

  async function confirmDeleteUser() {
    if (!deleteTarget) return
    setDeleteError('')
    setDeleteBusy(true)
    try {
      const res = await fetch(`/api/admin/users/${deleteTarget.id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setDeleteError(data.error || 'Delete failed')
        return
      }
      setDeleteTarget(null)
      await loadData()
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <div className="space-y-6">
        {/* Tabs */}
        <div className="mt-6 flex gap-8 border-b border-slate-200">
          <button
            type="button"
            onClick={() => setTab('overview')}
            className={cn(
              '-mb-px border-b-2 pb-3 text-sm font-medium transition-colors',
              tab === 'overview'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            )}
          >
            Overview
          </button>
          <button
            type="button"
            onClick={() => setTab('activity')}
            className={cn(
              '-mb-px border-b-2 pb-3 text-sm font-medium transition-colors',
              tab === 'activity'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            )}
          >
            Activity Log
          </button>
        </div>
     

      {tab === 'overview' && (
        <>
          {/* Metric cards */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[
              {
                label: 'Total Users',
                value: stats ? formatNumber(stats.totalUsers) : '—',
                icon: Users,
                ring: 'bg-slate-100 text-slate-700',
              },
              {
                label: 'Active Now',
                value: stats ? formatNumber(stats.activeNow) : '—',
                icon: Zap,
                ring: 'bg-amber-50 text-amber-600',
              },
              {
                label: 'VR Usage Hours',
                value: stats ? formatNumber(stats.vrUsageHours) : '—',
                icon: Clock,
                ring: 'bg-violet-50 text-violet-700',
              },
            ].map((card) => {
              const Icon = card.icon
              return (
                <div
                  key={card.label}
                  className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"
                >
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      {card.label}
                    </p>
                    <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">
                      {loading ? '…' : card.value}
                    </p>
                  </div>
                  <div
                    className={cn(
                      'flex h-12 w-12 items-center justify-center rounded-full',
                      card.ring
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              )
            })}
          </div>

           {/* Filters + list actions */}
        <div className="mt-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
            <div className="relative w-full min-w-0 max-w-md md:flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search students, faculty..."
                className="h-10 rounded-xl border-slate-200 bg-slate-50/80 pl-9 text-sm shadow-none"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                aria-label="Filter by role"
                className="h-10 min-w-0 max-w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm sm:min-w-[10rem]"
              >
                <option value="all">All roles</option>
                {filterRoleOptions.map((opt) => (
                  <option key={opt.code} value={opt.code}>
                    {opt.name}
                  </option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label="Filter by status"
                className="h-10 min-w-0 max-w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm sm:min-w-[10rem]"
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
              </select>
             
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button
              variant="outline"
              className="h-10 rounded-xl border-slate-200"
              type="button"
              onClick={exportCsv}
            >
              <Download className="mr-1.5 h-4 w-4" />
              Export CSV
            </Button>
            <Button
              className="h-10 rounded-xl bg-slate-900 text-white hover:bg-slate-800"
              type="button"
              onClick={() => {
                setInviteError('')
                setInviteName('')
                setInviteEmail('')
                setInvitePassword('')
                setInviteSubjectId('')
                setInviteRole(
                  (userRoleOptions.find((o) => o.code === 'STUDENT') ?? userRoleOptions[0])
                    ?.code ?? 'STUDENT'
                )
                setInviteOpen(true)
              }}
            >
              <UserPlus className="mr-1.5 h-4 w-4" />
              Add User
            </Button>
          </div>
        </div>

          {/* Table */}
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-200 bg-slate-50/90 hover:bg-slate-50/90">
                  <TableHead className="pl-6 font-semibold text-slate-600">
                    Profile
                  </TableHead>
                  <TableHead className="font-semibold text-slate-600">
                    Email address
                  </TableHead>
                  <TableHead className="font-semibold text-slate-600">Role</TableHead>
                  <TableHead className="font-semibold text-slate-600">Subject</TableHead>
                  <TableHead className="font-semibold text-slate-600">Status</TableHead>
                  <TableHead className="font-semibold text-slate-600">
                    Date created
                  </TableHead>
                  <TableHead className="pr-6 text-right font-semibold text-slate-600">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageSlice.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-12 text-center text-slate-500">
                      {loading ? 'Loading users…' : 'No users match your filters.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  pageSlice.map((u) => (
                    <TableRow key={u.id} className="border-slate-100">
                      <TableCell className="pl-6">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white',
                              u.role === 'ADMIN'
                                ? 'bg-indigo-600'
                                : u.role === 'TEACHER'
                                  ? 'bg-blue-600'
                                  : 'bg-sky-500'
                            )}
                          >
                            {initials(u.name)}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{u.name}</p>
                            <p className="text-xs text-slate-500">{profileSubtitle(u)}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate text-slate-600">
                        {u.email}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            'rounded-full border px-2.5 py-0.5 font-medium',
                            roleBadgeClass(u.role)
                          )}
                        >
                          {displayRoleName(u.role)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {u.role === 'TEACHER' && u.subject
                          ? `${u.subject.code}`
                          : u.role === 'TEACHER'
                            ? '—'
                            : '—'}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-2 text-sm text-slate-700">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          Active
                        </span>
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {formatDate(u.createdAt)}
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                            title="View"
                            onClick={() => setViewUser(u)}
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-700"
                            title="Edit"
                            onClick={() => openEdit(u)}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
                            title="Delete"
                            onClick={() => {
                              setDeleteError('')
                              setDeleteTarget(u)
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            <div className="flex flex-col gap-3 border-t border-slate-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                Showing{' '}
                {totalFiltered === 0
                  ? '0'
                  : `${(safePage - 1) * PAGE_SIZE + 1} to ${Math.min(safePage * PAGE_SIZE, totalFiltered)}`}{' '}
                of {formatNumber(totalFiltered)} entries
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {Array.from({ length: Math.min(5, pageCount) }, (_, i) => i + 1).map(
                  (n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setPage(n)}
                      className={cn(
                        'flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-medium',
                        n === safePage
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:bg-slate-100'
                      )}
                    >
                      {n}
                    </button>
                  )
                )}
                {pageCount > 5 && (
                  <span className="px-1 text-slate-400">…</span>
                )}
                <button
                  type="button"
                  disabled={safePage >= pageCount}
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {tab === 'activity' && (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-200 bg-slate-50/90 hover:bg-slate-50/90">
                <TableHead className="pl-6 font-semibold text-slate-600">When</TableHead>
                <TableHead className="font-semibold text-slate-600">User</TableHead>
                <TableHead className="font-semibold text-slate-600">Experiment</TableHead>
                <TableHead className="pr-6 font-semibold text-slate-600">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activity.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-12 text-center text-slate-500">
                    {loading ? 'Loading activity…' : 'No lab sessions recorded yet.'}
                  </TableCell>
                </TableRow>
              ) : (
                activity.map((row) => (
                  <TableRow key={row.id} className="border-slate-100">
                    <TableCell className="pl-6 text-slate-600">
                      {formatDateTime(row.at)}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-slate-900">{row.userName}</p>
                      <p className="text-xs text-slate-500">{row.userEmail}</p>
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-slate-700">
                      {row.experimentTitle}
                    </TableCell>
                    <TableCell className="pr-6">
                      <Badge
                        variant="outline"
                        className={cn(
                          'rounded-full border font-medium',
                          row.status === 'Completed' &&
                            'border-emerald-200 bg-emerald-50 text-emerald-800',
                          row.status === 'In progress' &&
                            'border-amber-200 bg-amber-50 text-amber-900',
                          row.status === 'Ended' &&
                            'border-slate-200 bg-slate-100 text-slate-700'
                        )}
                      >
                        {row.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!viewUser} onOpenChange={(o) => !o && setViewUser(null)}>
        <DialogContent className="max-w-md sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>User details</DialogTitle>
            <DialogDescription>
              Read-only summary for this account.
            </DialogDescription>
          </DialogHeader>
          {viewUser && (
            <div className="grid gap-4 py-2 text-sm">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div
                  className={cn(
                    'flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white',
                    viewUser.role === 'ADMIN'
                      ? 'bg-indigo-600'
                      : viewUser.role === 'TEACHER'
                        ? 'bg-blue-600'
                        : 'bg-sky-500'
                  )}
                >
                  {initials(viewUser.name)}
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{viewUser.name}</p>
                  <p className="text-xs text-slate-500">{profileSubtitle(viewUser)}</p>
                </div>
              </div>
              <dl className="grid gap-3">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Email
                  </dt>
                  <dd className="mt-0.5 break-all text-slate-900">{viewUser.email}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Role
                  </dt>
                  <dd className="mt-1">
                    <Badge
                      variant="outline"
                      className={cn(
                        'rounded-full border px-2.5 py-0.5 font-medium',
                        roleBadgeClass(viewUser.role)
                      )}
                    >
                      {displayRoleName(viewUser.role)}
                    </Badge>
                  </dd>
                </div>
                {viewUser.role === 'TEACHER' ? (
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Subject
                    </dt>
                    <dd className="mt-0.5 text-slate-900">
                      {viewUser.subject
                        ? `${viewUser.subject.code} — ${viewUser.subject.name}`
                        : 'Not assigned'}
                    </dd>
                  </div>
                ) : null}
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Status
                  </dt>
                  <dd className="mt-0.5 inline-flex items-center gap-2 text-slate-900">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Active
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Date created
                  </dt>
                  <dd className="mt-0.5 text-slate-900">{formatDate(viewUser.createdAt)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Lab sessions
                  </dt>
                  <dd className="mt-0.5 text-slate-900">
                    {formatNumber(viewUser._count.sessions)}
                  </dd>
                </div>
              </dl>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" type="button" onClick={() => setViewUser(null)}>
              Close
            </Button>
            {viewUser && (
              <Button
                type="button"
                className="bg-slate-900 text-white hover:bg-slate-800"
                onClick={() => {
                  const u = viewUser
                  setViewUser(null)
                  openEdit(u)
                }}
              >
                Edit user
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(o) => {
          if (!o) {
            setDeleteTarget(null)
            setDeleteError('')
          }
        }}
      >
        <DialogContent className="max-w-md sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>Delete user?</DialogTitle>
            <DialogDescription>
              {deleteTarget ? (
                <>
                  This will permanently remove{' '}
                  <span className="font-semibold text-slate-800">{deleteTarget.name}</span> (
                  <span className="font-mono text-xs text-slate-600">{deleteTarget.email}</span>)
                  from the system. This action cannot be undone.
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          {deleteError ? (
            <p className="text-sm text-red-600">{deleteError}</p>
          ) : null}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              type="button"
              disabled={deleteBusy}
              onClick={() => {
                setDeleteTarget(null)
                setDeleteError('')
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={deleteBusy}
              onClick={() => void confirmDeleteUser()}
            >
              {deleteBusy ? 'Deleting…' : 'Delete user'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-md sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>Invite user</DialogTitle>
            <DialogDescription>
              Create an account with a temporary password the user can change later.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="invite-name">Name</Label>
              <Input
                id="invite-name"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="e.g. John Teacher"
                autoComplete="off"
                className="h-10"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="e.g. teacher@school.ug"
                autoComplete="off"
                className="h-10"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="invite-pass">Temporary password</Label>
              <Input
                id="invite-pass"
                type="password"
                value={invitePassword}
                onChange={(e) => setInvitePassword(e.target.value)}
                placeholder="Choose a temporary password"
                autoComplete="new-password"
                className="h-10"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="invite-role">Role</Label>
              <select
                id="invite-role"
                value={inviteRole}
                onChange={(e) => {
                  setInviteRole(e.target.value)
                  if (e.target.value !== 'TEACHER') setInviteSubjectId('')
                }}
                className="h-10 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
              >
                {userRoleOptions.map((opt) => (
                  <option key={opt.code} value={opt.code}>
                    {opt.name}
                  </option>
                ))}
              </select>
            </div>
            {inviteRole === 'TEACHER' ? (
              <div className="grid gap-1.5">
                <Label htmlFor="invite-subject">Subject</Label>
                <select
                  id="invite-subject"
                  value={inviteSubjectId}
                  onChange={(e) => setInviteSubjectId(e.target.value)}
                  className="h-10 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  required
                >
                  <option value="">Select subject…</option>
                  {activeSubjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} — {s.name}
                    </option>
                  ))}
                </select>
                {activeSubjects.length === 0 ? (
                  <p className="text-xs text-amber-700">
                    Add an active subject under Settings → Subjects first.
                  </p>
                ) : null}
              </div>
            ) : null}
            {inviteError && (
              <p className="text-sm text-red-600">{inviteError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-slate-900 text-white hover:bg-slate-800"
              disabled={inviteBusy}
              onClick={submitInvite}
            >
              {inviteBusy ? 'Creating…' : 'Create user'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editUser} onOpenChange={(o) => !o && setEditUser(null)}>
        <DialogContent className="max-w-md sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>Edit user</DialogTitle>
            <DialogDescription>
              Update name, email, role, and subject for educators.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-10"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="h-10"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="edit-role">Role</Label>
              <select
                id="edit-role"
                value={editRole}
                onChange={(e) => {
                  setEditRole(e.target.value)
                  if (e.target.value !== 'TEACHER') setEditSubjectId('')
                }}
                className="h-10 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
              >
                {userRoleOptions.map((opt) => (
                  <option key={opt.code} value={opt.code}>
                    {opt.name}
                  </option>
                ))}
              </select>
            </div>
            {editRole === 'TEACHER' ? (
              <div className="grid gap-1.5">
                <Label htmlFor="edit-subject">Subject</Label>
                <select
                  id="edit-subject"
                  value={editSubjectId}
                  onChange={(e) => setEditSubjectId(e.target.value)}
                  className="h-10 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  required
                >
                  <option value="">Select subject…</option>
                  {activeSubjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} — {s.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            {editError && <p className="text-sm text-red-600">{editError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setEditUser(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-slate-900 text-white hover:bg-slate-800"
              disabled={editBusy}
              onClick={submitEdit}
            >
              {editBusy ? 'Saving…' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
