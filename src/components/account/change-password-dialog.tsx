'use client'

import { useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Check, Eye, EyeOff, KeyRound, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { defaultPortalPath } from '@/lib/portal-routes'
import {
  getPasswordPolicyChecks,
  validatePasswordPolicy,
} from '@/lib/password-policy'
import { cn } from '@/lib/utils'

type ChangePasswordDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  forced?: boolean
  portalHome: string
  onSuccess?: () => void
}

export function ChangePasswordDialog({
  open,
  onOpenChange,
  forced = false,
  portalHome,
  onSuccess,
}: ChangePasswordDialogProps) {
  const { data: session, update } = useSession()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const policyChecks = useMemo(
    () => getPasswordPolicyChecks(newPassword),
    [newPassword]
  )
  const policyMet = policyChecks.every((check) => check.passed)

  function resetFields() {
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setShowCurrent(false)
    setShowNew(false)
    setError('')
  }

  function handleDialogOpenChange(next: boolean) {
    if (forced && !next) return
    if (!next) resetFields()
    onOpenChange(next)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return

    setError('')

    const policyError = validatePasswordPolicy(newPassword)
    if (policyError) {
      setError(policyError)
      return
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match')
      return
    }

    if (currentPassword === newPassword) {
      setError('New password must be different from your current password')
      return
    }

    setBusy(true)
    try {
      const res = await fetch('/api/account/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Could not change password')
        return
      }

      await update({ mustChangePassword: false })
      resetFields()
      onSuccess?.()

      if (forced) {
        const destination =
          defaultPortalPath(
            session?.user
              ? { ...session.user, mustChangePassword: false }
              : undefined
          ) ?? portalHome
        window.location.assign(destination)
        return
      }

      onOpenChange(false)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent
        className="max-w-md gap-0 overflow-hidden p-0 sm:max-w-md"
        showCloseButton={!forced}
        onEscapeKeyDown={(e) => {
          if (forced) e.preventDefault()
        }}
        onInteractOutside={(e) => {
          if (forced) e.preventDefault()
        }}
      >
        <DialogHeader className="border-b border-slate-100 bg-slate-50/80 px-6 py-5 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-md">
            <KeyRound className="h-6 w-6" />
          </div>
          <DialogTitle className="app-page-title pt-3">
            {forced ? 'Set your new password' : 'Change password'}
          </DialogTitle>
          <DialogDescription className="text-slate-600">
            {forced
              ? 'You must choose a new password before you can use the system.'
              : 'Update your account password.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 px-6 py-5">
          <div className="grid gap-1.5">
            <Label htmlFor="dialog-current-password">Current password</Label>
            <div className="relative">
              <Input
                id="dialog-current-password"
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="h-10 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrent((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                aria-label={showCurrent ? 'Hide password' : 'Show password'}
                title={showCurrent ? 'Hide password' : 'Show password'}
              >
                {showCurrent ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {forced ? (
              <p className="app-caption text-slate-500">
                Use the temporary password you were given.
              </p>
            ) : null}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="dialog-new-password">New password</Label>
            <div className="relative">
              <Input
                id="dialog-new-password"
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="h-10 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                aria-label={showNew ? 'Hide password' : 'Show password'}
                title={showNew ? 'Hide password' : 'Show password'}
              >
                {showNew ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <ul className="app-caption space-y-1.5 rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
            {policyChecks.map((check) => (
              <li
                key={check.key}
                className={cn(
                  'flex items-start gap-2',
                  check.passed ? 'text-emerald-700' : 'text-slate-600'
                )}
              >
                {check.passed ? (
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                ) : (
                  <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                )}
                <span>{check.label}</span>
              </li>
            ))}
          </ul>

          <div className="grid gap-1.5">
            <Label htmlFor="dialog-confirm-password">Confirm new password</Label>
            <Input
              id="dialog-confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              className="h-10"
            />
          </div>

          {error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          ) : null}

          <DialogFooter className="border-t-0 bg-transparent p-0 pt-1">
            {!forced ? (
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-xl"
                disabled={busy}
                onClick={() => handleDialogOpenChange(false)}
              >
                Cancel
              </Button>
            ) : null}
            <Button
              type="submit"
              disabled={busy || !policyMet}
              className="h-10 rounded-xl bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {busy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                'Save new password'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
