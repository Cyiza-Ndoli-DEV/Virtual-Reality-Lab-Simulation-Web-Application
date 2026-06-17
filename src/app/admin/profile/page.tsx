'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { AccountSettingsLayout } from '@/components/account/account-settings-layout'
import { AvatarUploadSection } from '@/components/account/avatar-upload-section'
import { useChangePasswordDialog } from '@/components/account/change-password-provider'
import { useAdminAppHeader, useAdminPageHeader } from '@/components/admin/admin-app-header-context'
import { joinName, splitName } from '@/lib/account-name'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface MePayload {
  id: string
  name: string
  email: string
  role: string
  avatarUrl: string | null
  createdAt: string
  updatedAt: string
  portalLabel: string
}

export default function AdminProfilePage() {
  const { setHeaderUser, sessionUser } = useAdminAppHeader()
  useAdminPageHeader('Account', false)
  const openChangePassword = useChangePasswordDialog()

  const [me, setMe] = useState<MePayload | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saveBusy, setSaveBusy] = useState(false)
  const [saveError, setSaveError] = useState('')

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')

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
      const profile = data as MePayload
      setMe(profile)
      const { firstName: first, lastName: last } = splitName(profile.name)
      setFirstName(first)
      setLastName(last)
      setEmail(profile.email)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  function resetForm() {
    if (!me) return
    const { firstName: first, lastName: last } = splitName(me.name)
    setFirstName(first)
    setLastName(last)
    setEmail(me.email)
    setSaveError('')
  }

  function handleAvatarChange(avatarUrl: string | null) {
    setMe((current) => (current ? { ...current, avatarUrl } : current))
    if (sessionUser) {
      setHeaderUser({ ...sessionUser, avatarUrl })
    }
  }

  async function saveProfile() {
    if (!me) return
    const name = joinName(firstName, lastName)
    const normalizedEmail = email.trim().toLowerCase()
    if (!name || !normalizedEmail) {
      setSaveError('Name and email are required')
      return
    }
    setSaveError('')
    setSaveBusy(true)
    try {
      const res = await fetch(`/api/admin/users/${me.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email: normalizedEmail, role: me.role }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setSaveError(data.error || 'Could not save changes')
        return
      }
      await load()
    } finally {
      setSaveBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-slate-200/80 bg-white">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading account…
        </div>
      </div>
    )
  }

  if (error || !me) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-8 text-sm text-red-600">
        {error || 'Could not load account'}
      </div>
    )
  }

  return (
    <AccountSettingsLayout>
      <div className="flex h-full flex-col px-6 py-8 sm:px-10">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Account</h1>

        <AvatarUploadSection
          avatarUrl={me.avatarUrl}
          email={me.email}
          name={me.name}
          onAvatarChange={handleAvatarChange}
          onError={setSaveError}
        />

        <section className="space-y-5 border-b border-slate-200 py-8">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="account-first-name" className="text-slate-700">
                First Name
              </Label>
              <Input
                id="account-first-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="h-11 rounded-lg border-slate-200 bg-white"
                autoComplete="given-name"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="account-last-name" className="text-slate-700">
                Last Name
              </Label>
              <Input
                id="account-last-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="h-11 rounded-lg border-slate-200 bg-white"
                autoComplete="family-name"
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="account-email" className="text-slate-700">
              Email
            </Label>
            <Input
              id="account-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 rounded-lg border-slate-200 bg-white"
              autoComplete="email"
            />
            <p className="text-xs text-slate-500">Used to log in to your account</p>
          </div>

          <div className="grid gap-1.5 sm:max-w-xs">
            <Label className="text-slate-700">Role</Label>
            <Input
              value={me.portalLabel}
              readOnly
              className="h-11 rounded-lg border-slate-200 bg-slate-50 text-slate-600"
            />
          </div>
        </section>

        <section className="flex flex-col gap-4 border-b border-slate-200 py-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-lg">
            <h2 className="text-sm font-semibold text-slate-900">Password</h2>
            <p className="mt-1 text-sm text-slate-500">
              Log in with your password instead of using temporary login codes
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-10 shrink-0 rounded-lg border-slate-200 px-5"
            onClick={() => openChangePassword?.()}
          >
            Change Password
          </Button>
        </section>

        {saveError ? (
          <p className="mt-4 text-sm text-red-600">{saveError}</p>
        ) : null}

        <div className="mt-auto flex justify-end gap-3 pt-8">
          <Button
            type="button"
            variant="outline"
            className="h-10 min-w-[88px] rounded-lg border-slate-200"
            disabled={saveBusy}
            onClick={resetForm}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="h-10 min-w-[88px] rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            disabled={saveBusy}
            onClick={() => void saveProfile()}
          >
            {saveBusy ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>
    </AccountSettingsLayout>
  )
}
