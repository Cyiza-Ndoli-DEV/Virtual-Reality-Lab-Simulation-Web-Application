'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Pencil } from 'lucide-react'
import { useAdminPageHeader } from '@/components/admin/admin-app-header-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface MePayload {
  id: string
  name: string
  email: string
  role: string
  createdAt: string
  updatedAt: string
  portalLabel: string
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(iso))
}

export default function AdminProfilePage() {
  useAdminPageHeader('Profile', false)
  const router = useRouter()
  const [me, setMe] = useState<MePayload | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [saveBusy, setSaveBusy] = useState(false)
  const [saveError, setSaveError] = useState('')

  const load = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/admin/me')
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Could not load profile')
        setMe(null)
        return
      }
      setMe(data as MePayload)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const avatarSeed = encodeURIComponent(me?.email || me?.name || 'user')

  function startEdit() {
    if (!me) return
    setSaveError('')
    setEditName(me.name)
    setEditEmail(me.email)
    setEditing(true)
  }

  function cancelEdit() {
    setEditing(false)
    setSaveError('')
    if (me) {
      setEditName(me.name)
      setEditEmail(me.email)
    }
  }

  async function saveProfile() {
    if (!me) return
    const name = editName.trim()
    const email = editEmail.trim().toLowerCase()
    if (!name || !email) {
      setSaveError('Name and email are required')
      return
    }
    setSaveError('')
    setSaveBusy(true)
    try {
      const res = await fetch(`/api/admin/users/${me.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, role: me.role }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setSaveError(data.error || 'Could not save changes')
        return
      }
      setEditing(false)
      await load()
    } finally {
      setSaveBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Button
          type="button"
          variant="outline"
          size="default"
          className="mb-4 h-10 gap-2 rounded-xl border-slate-200 px-4 shadow-sm"
          onClick={() => router.push('/admin/dashboard')}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Button>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Account
        </p>
        <p className="mt-1 text-sm text-slate-600">
          Your signed-in account details. Password changes can be added here later or handled by
          your institution&apos;s policy.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-8 sm:px-6">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading profile…
            </div>
          ) : error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : me ? (
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="flex shrink-0 flex-col gap-2 self-start pt-1 sm:self-center sm:pt-0">
                {!editing ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 gap-1.5 rounded-xl border-slate-200 shadow-sm"
                    onClick={startEdit}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 rounded-xl border-slate-200"
                      disabled={saveBusy}
                      onClick={cancelEdit}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="h-9 rounded-xl bg-slate-900 text-white hover:bg-slate-800"
                      disabled={saveBusy}
                      onClick={() => void saveProfile()}
                    >
                      {saveBusy ? 'Saving…' : 'Save'}
                    </Button>
                  </>
                )}
              </div>

              <div className="flex min-w-0 flex-1 flex-col items-center gap-4 text-center sm:flex-row sm:justify-center sm:text-left">
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-white bg-slate-200 shadow-md ring-2 ring-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}`}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <h2 className="font-serif text-2xl font-semibold tracking-tight text-slate-900">
                    {editing ? editName || '—' : me.name}
                  </h2>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {me.portalLabel}
                  </p>
                  <p className="mt-2 truncate text-sm text-slate-600">
                    {editing ? editEmail || '—' : me.email}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="px-6 py-6">
          {loading ? null : error ? null : me ? (
            <>
              {editing ? (
                <div className="mb-6 grid gap-4 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                  <div className="grid gap-1.5">
                    <Label htmlFor="profile-name">Full name</Label>
                    <Input
                      id="profile-name"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-10"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="profile-email">Email</Label>
                    <Input
                      id="profile-email"
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="h-10"
                    />
                  </div>
                  {saveError ? (
                    <p className="text-sm text-red-600">{saveError}</p>
                  ) : null}
                </div>
              ) : null}
              <dl className="grid gap-4 text-sm">
                {!editing ? (
                  <>
                    <div className="flex flex-col gap-0.5 border-b border-slate-100 pb-4 sm:flex-row sm:justify-between">
                      <dt className="font-medium text-slate-500">Full name</dt>
                      <dd className="text-slate-900">{me.name}</dd>
                    </div>
                    <div className="flex flex-col gap-0.5 border-b border-slate-100 pb-4 sm:flex-row sm:justify-between">
                      <dt className="font-medium text-slate-500">Email</dt>
                      <dd className="break-all text-slate-900">{me.email}</dd>
                    </div>
                  </>
                ) : null}
                <div className="flex flex-col gap-0.5 border-b border-slate-100 pb-4 sm:flex-row sm:justify-between">
                  <dt className="font-medium text-slate-500">Role code</dt>
                  <dd className="font-mono text-slate-900">{me.role}</dd>
                </div>
                <div className="flex flex-col gap-0.5 border-b border-slate-100 pb-4 sm:flex-row sm:justify-between">
                  <dt className="font-medium text-slate-500">User ID</dt>
                  <dd className="break-all font-mono text-xs text-slate-700">{me.id}</dd>
                </div>
                <div className="flex flex-col gap-0.5 border-b border-slate-100 pb-4 sm:flex-row sm:justify-between">
                  <dt className="font-medium text-slate-500">Member since</dt>
                  <dd className="text-slate-900">{formatDate(me.createdAt)}</dd>
                </div>
                <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between">
                  <dt className="font-medium text-slate-500">Last updated</dt>
                  <dd className="text-slate-900">{formatDate(me.updatedAt)}</dd>
                </div>
              </dl>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
