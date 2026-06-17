'use client'

import Link from 'next/link'
import { useState } from 'react'
import {
  LoginAuthShell,
  authAlertClassName,
  authFieldClassName,
} from '@/components/login/login-auth-shell'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return

    setLoading(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.')
        return
      }

      setMessage(
        data.message ??
          'If an account exists for that email, password reset instructions have been sent.'
      )
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <LoginAuthShell
      title="Forgot password?"
      subtitle="No worries, we'll send you reset instructions."
      submitLabel="Reset password"
      submitForm="forgot-password-form"
      loading={loading}
      footer={
        message ? (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <Link
              href="/login"
              className="flex h-10 w-full items-center justify-center rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Back to sign in
            </Link>
          </div>
        ) : undefined
      }
    >
      {message ? (
        <div className={authAlertClassName.success}>{message}</div>
      ) : (
        <form id="forgot-password-form" onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className={authFieldClassName}
          />

          {error && <div className={authAlertClassName.error}>{error}</div>}
        </form>
      )}
    </LoginAuthShell>
  )
}
