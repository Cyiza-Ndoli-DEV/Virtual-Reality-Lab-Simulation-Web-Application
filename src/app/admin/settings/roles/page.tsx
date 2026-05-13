'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { MoreHorizontal, Plus } from 'lucide-react'
import { DropdownMenu as DropdownMenuPrimitive } from 'radix-ui'
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
import { APP_FEATURES, type AppFeatureKey } from '@/lib/app-features'
import { useAdminPageHeader } from '@/components/admin/admin-app-header-context'

interface RoleRow {
  id: string
  code: string
  name: string
  description: string | null
  isSystem: boolean
  createdAt: string
  updatedAt: string
  userCount: number
  permissionAllowedCount: number
  permissionTotal: number
  permissions: { featureKey: string; allowed: boolean }[]
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(iso))
}

function permissionsToMap(
  list: { featureKey: string; allowed: boolean }[]
): Record<AppFeatureKey, boolean> {
  const m = Object.fromEntries(
    APP_FEATURES.map((f) => [f.key, false])
  ) as Record<AppFeatureKey, boolean>
  for (const p of list) {
    if (APP_FEATURES.some((f) => f.key === p.featureKey)) {
      m[p.featureKey as AppFeatureKey] = p.allowed
    }
  }
  return m
}

export default function AdminSettingsRolesPage() {
  useAdminPageHeader('Roles', false)

  const [rows, setRows] = useState<RoleRow[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [addBusy, setAddBusy] = useState(false)
  const [addError, setAddError] = useState('')

  const [permRole, setPermRole] = useState<RoleRow | null>(null)
  const [permMap, setPermMap] = useState<Record<AppFeatureKey, boolean>>(
    () => permissionsToMap([])
  )
  const [permBusy, setPermBusy] = useState(false)
  const [permError, setPermError] = useState('')

  const [editRole, setEditRole] = useState<RoleRow | null>(null)
  const [editCode, setEditCode] = useState('')
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editBusy, setEditBusy] = useState(false)
  const [editError, setEditError] = useState('')

  const featureGroups = useMemo(() => {
    const g = new Map<string, (typeof APP_FEATURES)[number][]>()
    for (const f of APP_FEATURES) {
      const list = g.get(f.group) ?? []
      g.set(f.group, [...list, f])
    }
    return Array.from(g.entries())
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/settings/roles')
      if (!res.ok) return
      const data = await res.json()
      setRows(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  function openPermissions(r: RoleRow) {
    setPermError('')
    setPermRole(r)
    setPermMap(permissionsToMap(r.permissions))
  }

  function openEditMeta(r: RoleRow) {
    setEditError('')
    setEditRole(r)
    setEditCode(r.code)
    setEditName(r.name)
    setEditDescription(r.description ?? '')
  }

  async function saveEditMeta() {
    if (!editRole) return
    setEditError('')
    const trimmedName = editName.trim()
    if (!trimmedName) {
      setEditError('Display name is required')
      return
    }
    setEditBusy(true)
    try {
      const payload: Record<string, unknown> = {
        name: trimmedName,
        description: editDescription.trim() ? editDescription.trim() : null,
      }
      if (!editRole.isSystem) {
        payload.code = editCode
      }
      const res = await fetch(`/api/admin/settings/roles/${editRole.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setEditError(data.error || 'Could not update role')
        return
      }
      setEditRole(null)
      await load()
    } finally {
      setEditBusy(false)
    }
  }

  async function savePermissions() {
    if (!permRole) return
    setPermError('')
    setPermBusy(true)
    try {
      const res = await fetch(`/api/admin/settings/roles/${permRole.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: permMap }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setPermError(data.error || 'Could not save permissions')
        return
      }
      setPermRole(null)
      await load()
    } finally {
      setPermBusy(false)
    }
  }

  async function submitAdd() {
    setAddError('')
    setAddBusy(true)
    try {
      const res = await fetch('/api/admin/settings/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, name, description }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setAddError(data.error || 'Could not create role')
        return
      }
      setAddOpen(false)
      setCode('')
      setName('')
      setDescription('')
      await load()
    } finally {
      setAddBusy(false)
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Settings / Roles
          </p>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Each role has <strong>feature permissions</strong> (who can open which areas of the
            app). Users still have a single assigned role from User Management;{' '}
            <strong>per-user permission overrides</strong> are not part of this screen yet.
          </p>
        </div>
        <Button
          type="button"
          className="h-10 shrink-0 self-start rounded-xl bg-slate-900 text-white hover:bg-slate-800 sm:self-auto"
          onClick={() => {
            setAddError('')
            setAddOpen(true)
          }}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Add role
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-200 bg-slate-50/90 hover:bg-slate-50/90">
              <TableHead className="pl-6 font-semibold text-slate-600">Code</TableHead>
              <TableHead className="font-semibold text-slate-600">Name</TableHead>
              <TableHead className="font-semibold text-slate-600">Description</TableHead>
              <TableHead className="text-right font-semibold text-slate-600">Users</TableHead>
              <TableHead className="font-semibold text-slate-600">Permissions</TableHead>
              <TableHead className="font-semibold text-slate-600">Updated</TableHead>
              <TableHead className="w-12 pr-6 text-right font-semibold text-slate-600">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-slate-500">
                  Loading roles…
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-slate-500">
                  No roles found. Run{' '}
                  <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">npm run seed</code>{' '}
                  to create default roles and permissions, or add a role with the button above.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id} className="border-slate-100">
                  <TableCell className="pl-6">
                    <span className="font-mono text-sm font-medium text-slate-900">{r.code}</span>
                  </TableCell>
                  <TableCell className="font-medium text-slate-900">{r.name}</TableCell>
                  <TableCell className="max-w-md text-slate-600">
                    <span className="line-clamp-2 text-sm">{r.description || '—'}</span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-slate-700">
                    {r.userCount}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="rounded-full font-medium tabular-nums">
                      {r.permissionAllowedCount}/{r.permissionTotal} features
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-600">{formatDate(r.updatedAt)}</TableCell>
                  <TableCell className="pr-6 text-right">
                    <DropdownMenuPrimitive.Root modal={false}>
                      <DropdownMenuPrimitive.Trigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="text-slate-600 hover:text-slate-900"
                          aria-label={`Actions for ${r.name}`}
                        >
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuPrimitive.Trigger>
                      <DropdownMenuPrimitive.Portal>
                        <DropdownMenuPrimitive.Content
                          align="end"
                          sideOffset={6}
                          className="data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-[12rem] overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-lg outline-none data-[state=open]:animate-in data-[state=closed]:animate-out"
                        >
                          <DropdownMenuPrimitive.Item
                            className="cursor-pointer rounded-lg px-2.5 py-2 text-sm text-slate-800 outline-none select-none data-[highlighted]:bg-slate-100"
                            onSelect={() => openEditMeta(r)}
                          >
                            Edit role name and code
                          </DropdownMenuPrimitive.Item>
                          <DropdownMenuPrimitive.Item
                            className="cursor-pointer rounded-lg px-2.5 py-2 text-sm text-slate-800 outline-none select-none data-[highlighted]:bg-slate-100"
                            onSelect={() => openPermissions(r)}
                          >
                            Edit feature permissions
                          </DropdownMenuPrimitive.Item>
                        </DropdownMenuPrimitive.Content>
                      </DropdownMenuPrimitive.Portal>
                    </DropdownMenuPrimitive.Root>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!permRole} onOpenChange={(o) => !o && setPermRole(null)}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto sm:max-w-lg" showCloseButton>
          <DialogHeader>
            <DialogTitle>Feature permissions</DialogTitle>
            <DialogDescription>
              {permRole ? (
                <>
                  Role <span className="font-mono font-medium">{permRole.code}</span> — toggle
                  which areas this role may use. Saving updates the database; wiring every screen to
                  enforce these checks can be done gradually in the app.
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 py-2">
            {featureGroups.map(([group, features]) => (
              <div key={group}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {group}
                </p>
                <ul className="space-y-2">
                  {features.map((f) => (
                    <li key={f.key} className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2">
                      <input
                        type="checkbox"
                        id={`perm-${f.key}`}
                        checked={permMap[f.key]}
                        onChange={(e) =>
                          setPermMap((m) => ({ ...m, [f.key]: e.target.checked }))
                        }
                        className="mt-1 size-4 rounded border-slate-300"
                      />
                      <label htmlFor={`perm-${f.key}`} className="cursor-pointer text-sm leading-snug">
                        <span className="font-medium text-slate-900">{f.label}</span>
                        <span className="mt-0.5 block font-mono text-[10px] text-slate-400">
                          {f.key}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {permError && <p className="text-sm text-red-600">{permError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setPermRole(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-slate-900 text-white hover:bg-slate-800"
              disabled={permBusy}
              onClick={savePermissions}
            >
              {permBusy ? 'Saving…' : 'Save permissions'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editRole}
        onOpenChange={(o) => {
          if (!o) setEditRole(null)
        }}
      >
        <DialogContent className="max-w-md sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>Edit role</DialogTitle>
            <DialogDescription>
              {editRole ? (
                <>
                  Update the display name and description for this role.
                  {editRole.isSystem ? (
                    <>
                      {' '}
                      Built-in roles cannot change their <span className="font-mono">code</span>{' '}
                      (it matches user assignment in the database).
                    </>
                  ) : (
                    <> You may also change the role code; use uppercase with underscores.</>
                  )}
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="edit-role-code">Code</Label>
              <Input
                id="edit-role-code"
                value={editCode}
                onChange={(e) => setEditCode(e.target.value)}
                placeholder="e.g. LAB_ASSISTANT"
                className="h-10 font-mono"
                disabled={!!editRole?.isSystem}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="edit-role-name">Display name</Label>
              <Input
                id="edit-role-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Role name"
                className="h-10"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="edit-role-desc">Description (optional)</Label>
              <Textarea
                id="edit-role-desc"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="What this role is for…"
                rows={3}
                className="min-h-[80px] resize-y"
              />
            </div>
            {editError && <p className="text-sm text-red-600">{editError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setEditRole(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-slate-900 text-white hover:bg-slate-800"
              disabled={editBusy}
              onClick={() => void saveEditMeta()}
            >
              {editBusy ? 'Saving…' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>Add role</DialogTitle>
            <DialogDescription>
              Create a catalog entry. Codes are stored uppercase (e.g. LAB_ASSISTANT). New roles
              start with no permissions until you edit them.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="role-code">Code</Label>
              <Input
                id="role-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. LAB_ASSISTANT"
                className="h-10 font-mono"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="role-name">Display name</Label>
              <Input
                id="role-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Lab assistant"
                className="h-10"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="role-desc">Description (optional)</Label>
              <Textarea
                id="role-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What this role is for…"
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
              className="bg-slate-900 text-white hover:bg-slate-800"
              disabled={addBusy}
              onClick={submitAdd}
            >
              {addBusy ? 'Saving…' : 'Create role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
