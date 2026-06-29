'use client'

import Link from 'next/link'
import { Suspense, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Check, Eye, EyeOff, X } from 'lucide-react'
import {
  LoginAuthShell,
  authAlertClassName,
  authFieldClassName,
} from '@/components/login/login-auth-shell'
import {
  getPasswordPolicyChecks,
  validatePasswordPolicy,
} from '@/lib/password-policy'
import { cn } from '@/lib/utils'

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <LoginAuthShell title="Reset password" subtitle="Loading…">
          <div className="h-10" />
        </LoginAuthShell>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  )
}

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const policyChecks = useMemo(
    () => getPasswordPolicyChecks(newPassword),
    [newPassword]
  )
  const policyMet = policyChecks.every((check) => check.passed)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return

    setError('')

    if (!token) {
      setError('Reset link is invalid or has expired')
      return
    }

    const policyError = validatePasswordPolicy(newPassword)
    if (policyError) {
      setError(policyError)
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error ?? 'Could not reset password')
        return
      }

      router.push('/login?reset=1')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <LoginAuthShell
        title="Link expired"
        subtitle="This reset link is invalid or has expired."
        icon="key"
        footer={
          <div className="mt-4 border-t border-slate-100 pt-4">
            <div className="flex gap-3">
              <Link
                href="/login"
                className="flex h-10 flex-1 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                Cancel
              </Link>
              <Link
                href="/login/forgot-password"
                className="flex h-10 flex-1 items-center justify-center rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                Request new link
              </Link>
            </div>
          </div>
        }
      >
        <div className={authAlertClassName.warning}>
          Request a new link from the forgot password page.
        </div>
      </LoginAuthShell>
    )
  }

  return (
    <LoginAuthShell
      title="Reset password"
      subtitle="Choose a new password for your account."
      icon="key"
      submitLabel="Update password"
      submitForm="reset-password-form"
      loading={loading}
      submitDisabled={!policyMet}
    >
      <form id="reset-password-form" onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            autoComplete="new-password"
            className={cn(authFieldClassName, 'pr-10')}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            title={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>

        {newPassword.length > 0 && (
          <ul className="space-y-1">
            {policyChecks.map((check) => (
              <li
                key={check.key}
                className={cn(
                  'flex items-center gap-1.5 text-xs',
                  check.passed ? 'text-emerald-600' : 'text-slate-500'
                )}
              >
                {check.passed ? (
                  <Check className="h-3 w-3 shrink-0" />
                ) : (
                  <X className="h-3 w-3 shrink-0" />
                )}
                {check.label}
              </li>
            ))}
          </ul>
        )}

        <input
          type={showPassword ? 'text' : 'password'}
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          autoComplete="new-password"
          className={authFieldClassName}
        />

        {error && <div className={authAlertClassName.error}>{error}</div>}
      </form>
    </LoginAuthShell>
  )
}
