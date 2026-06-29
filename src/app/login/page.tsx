'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Suspense, useEffect, useState } from 'react'
import { getCsrfToken, signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff, FlaskConical, GraduationCap, Atom } from 'lucide-react'
import { defaultPortalPath, safeCallbackUrl } from '@/lib/portal-routes'
import { REMEMBER_EMAIL_STORAGE_KEY } from '@/lib/session-duration'

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginShell loading />}>
      <LoginForm />
    </Suspense>
  )
}

function LoginShell({ loading }: { loading?: boolean }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-sky-50 via-white to-cyan-50">
      <p className="text-sm text-slate-500">
        {loading ? 'Loading sign in…' : 'Preparing sign in…'}
      </p>
    </div>
  )
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = safeCallbackUrl(searchParams.get('callbackUrl'))
  const justSignedOut = searchParams.get('signedOut') === '1'
  const passwordReset = searchParams.get('reset') === '1'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const savedEmail = localStorage.getItem(REMEMBER_EMAIL_STORAGE_KEY)
    if (savedEmail) {
      setEmail(savedEmail)
      setRememberMe(true)
    }
  }, [])

  useEffect(() => {
    if (!passwordReset) return
    setSuccess('Your password was updated. Sign in with your new password.')
    router.replace('/login', { scroll: false })
  }, [passwordReset, router])

  useEffect(() => {
    if (!justSignedOut) return
    setEmail('')
    setPassword('')
    setShowPassword(false)
    setError('')
    router.replace('/login', { scroll: false })
  }, [justSignedOut, router])

  useEffect(() => {
    const hasCredsInUrl =
      searchParams.has('email') || searchParams.has('password')
    if (!hasCredsInUrl) return

    const emailFromUrl = searchParams.get('email')
    if (emailFromUrl) setEmail(emailFromUrl)

    const clean = new URL(window.location.href)
    clean.searchParams.delete('email')
    clean.searchParams.delete('password')
    window.history.replaceState(null, '', `${clean.pathname}${clean.search}`)
  }, [searchParams])

  async function handleLogin() {
    if (loading) return
    setLoading(true)
    setError('')

    try {
      const csrfToken = await getCsrfToken()
      if (!csrfToken) {
        setError('Sign-in could not start. Refresh the page and try again.')
        return
      }

      const result = await signIn('credentials', {
        email,
        password,
        rememberMe: rememberMe ? 'true' : 'false',
        csrfToken,
        redirect: false,
      })

      if (result?.error) {
        setError(
          result.error === 'MissingCSRF'
            ? 'Session expired. Refresh the page and try again.'
            : 'Invalid email, username, or password'
        )
        return
      }

      if (rememberMe) {
        localStorage.setItem(REMEMBER_EMAIL_STORAGE_KEY, email.trim())
      } else {
        localStorage.removeItem(REMEMBER_EMAIL_STORAGE_KEY)
      }

      const response = await fetch('/api/auth/session')
      const session = await response.json()
      const user = session?.user
      const destination =
        callbackUrl ?? defaultPortalPath(user) ?? '/login'

      router.push(destination)
      router.refresh()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-cyan-50">

      <div className="grid min-h-screen lg:grid-cols-2">

        {/* LEFT SIDE */}
        <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-gradient-to-br from-blue-600 to-cyan-500 p-12">

          {/* Decorative circles */}
          <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-white/10" />
          <div className="absolute bottom-0 left-0 h-56 w-56 rounded-full bg-white/10" />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm text-white backdrop-blur-sm">
              <Atom className="h-4 w-4" />
              Virtual Reality Science Practical System
            </div>

            <h1 className="mt-8 max-w-xl text-4xl font-bold leading-tight text-white">
              Experience Science Practicals in Virtual Reality
            </h1>

            <p className="mt-6 max-w-lg text-lg leading-8 text-blue-100">
              Conduct immersive chemistry, physics, and biology experiments
              through an interactive VR learning environment designed for
              modern education.
            </p>

            <div className="mt-10 space-y-5">

              <div className="flex items-start gap-4 rounded-2xl bg-white/15 p-5 backdrop-blur-md">
                <div className="rounded-xl bg-white/20 p-3">
                  <FlaskConical className="h-5 w-5 text-white" />
                </div>

                <div>
                  <h3 className="font-semibold text-white">
                    Interactive Experiments
                  </h3>

                  <p className="mt-1 text-[0.9375rem] text-blue-100">
                    Perform laboratory practicals safely in a fully virtual environment.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 rounded-2xl bg-white/15 p-5 backdrop-blur-md">
                <div className="rounded-xl bg-white/20 p-3">
                  <GraduationCap className="h-5 w-5 text-white" />
                </div>

                <div>
                  <h3 className="font-semibold text-white">
                    Smart Learning Analytics
                  </h3>

                  <p className="mt-1 text-[0.9375rem] text-blue-100">
                    Track student progress, performance, and practical completion.
                  </p>
                </div>
              </div>

            </div>
          </div>

          {/* IMAGE */}
          <div className="relative z-10 mt-10 flex justify-center">
            <Image
              src="https://images.unsplash.com/photo-1532094349884-543bc11b234d?q=80&w=1200&auto=format&fit=crop"
              alt="VR Science Lab"
              width={500}
              height={350}
              className="rounded-3xl border border-white/20 object-cover shadow-2xl"
            />
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="flex items-center justify-center px-6 py-12">

          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl">

            {/* Mobile image */}
            <div className="mb-6 overflow-hidden rounded-2xl lg:hidden">
              <Image
                src="https://images.unsplash.com/photo-1532094349884-543bc11b234d?q=80&w=1200&auto=format&fit=crop"
                alt="VR Science"
                width={600}
                height={300}
                className="h-52 w-full object-cover"
              />
            </div>

            <div className="mb-8 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 shadow-lg">
                <Atom className="h-8 w-8 text-white" />
              </div>

              <h2 className="app-page-title mt-5 text-slate-800">
                Welcome to VRSPS
              </h2>

              <p className="app-body-muted mt-2">
                Sign in to access the VRSPS dashboard
              </p>
            </div>

            <form
              key={justSignedOut ? 'signed-out' : 'login'}
              onSubmit={(e) => {
                e.preventDefault()
                void handleLogin()
              }}
              className="space-y-5"
              autoComplete="off"
            >

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Email or username
                </label>

                <input
                  type="text"
                  placeholder="you@school.edu or username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="off"
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Password
                </label>

                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 pr-12 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  Remember me
                </label>

                <Link
                  href="/login/forgot-password"
                  className="text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  Forgot password?
                </Link>
              </div>

              {success && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {success}
                </div>
              )}

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="h-12 w-full rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-sm font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-70"
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </button>

            </form>

            <div className="mt-8 border-t border-slate-100 pt-5 text-center">
              <p className="text-xs leading-6 text-slate-500">
                Secure access for students, teachers, and administrators.
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}