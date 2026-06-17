import type { ReactNode } from 'react'
import Link from 'next/link'
import { HelpCircle, KeyRound } from 'lucide-react'
import { cn } from '@/lib/utils'

type LoginAuthShellProps = {
  title: string
  subtitle: string
  children: ReactNode
  icon?: 'question' | 'key'
  cancelHref?: string
  cancelLabel?: string
  submitLabel?: string
  submitForm?: string
  loading?: boolean
  submitDisabled?: boolean
  footer?: ReactNode
}

export function LoginAuthShell({
  title,
  subtitle,
  children,
  icon = 'question',
  cancelHref = '/login',
  cancelLabel = 'Cancel',
  submitLabel = 'Continue',
  submitForm,
  loading = false,
  submitDisabled = false,
  footer,
}: LoginAuthShellProps) {
  const Icon = icon === 'key' ? KeyRound : HelpCircle

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-sky-50 via-white to-cyan-50 px-4">
      <div className="w-full max-w-[400px] rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-cyan-500">
            <Icon className="h-5 w-5 text-white" strokeWidth={2.25} />
          </div>

          <h1 className="mt-3 text-lg font-semibold text-slate-800">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>

        <div className="mt-4">{children}</div>

        {footer ?? (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <div className="flex gap-3">
              <Link
                href={cancelHref}
                className="flex h-10 flex-1 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                {cancelLabel}
              </Link>
              <button
                type="submit"
                form={submitForm}
                disabled={loading || submitDisabled}
                className={cn(
                  'flex h-10 flex-1 items-center justify-center rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60'
                )}
              >
                {loading ? 'Please wait…' : submitLabel}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export const authFieldClassName =
  'h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100'

export const authAlertClassName = {
  error: 'rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600',
  success:
    'rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700',
  warning:
    'rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800',
}
