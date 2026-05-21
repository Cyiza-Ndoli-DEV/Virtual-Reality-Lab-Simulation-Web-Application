'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { StatsBar, type DashboardStats } from '@/components/student/stats-bar'
import { formatDuration } from '@/lib/student-lab-status'

interface StudentProfilePayload {
  id: string
  name: string
  email: string
  role: string
  createdAt: string
  updatedAt: string
  portalLabel: string
  practitionerSubtitle: string
  stats: DashboardStats & {
    totalLabSessions: number
    questionnairesSubmitted: number
    labsReviewedComplete: number
  }
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(iso))
}

export default function StudentProfilePage() {
  const [me, setMe] = useState<StudentProfilePayload | null>(null)
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
      const res = await fetch('/api/student/me')
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Could not load profile')
        setMe(null)
        return
      }
      setMe(data as StudentProfilePayload)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    queueMicrotask(() => {
      void load()
    })
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
      const res = await fetch('/api/student/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setSaveError(data.error || 'Could not save changes')
        return
      }
      setMe(data as StudentProfilePayload)
      setEditing(false)
    } finally {
      setSaveBusy(false)
    }
  }

  const dashboardStats: DashboardStats | null = me
    ? {
        completedPracticals: me.stats.completedPracticals,
        timeInVRSeconds: me.stats.timeInVRSeconds,
        averageGradePercent: me.stats.averageGradePercent,
        topPercentileLabel: me.stats.topPercentileLabel,
      }
    : null

  return (
    <div className="space-y-8">
      <div>
        <Button
          asChild
          variant="outline"
          className="mb-4 h-10 gap-2 rounded-xl border-slate-200 shadow-sm"
        >
          <Link href="/student/dashboard">
            <ArrowLeft className="h-4 w-4" />
            Back to my labs
          </Link>
        </Button>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          My account
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
          Profile
        </h1>
        <p className="mt-1 max-w-xl text-sm text-slate-600">
          Your student account, lab activity summary, and contact details.
        </p>
      </div>

      {dashboardStats ? <StatsBar stats={dashboardStats} /> : null}

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
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
              <div className="flex shrink-0 flex-col gap-2 sm:order-2">
                {!editing ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 gap-1.5 rounded-xl border-slate-200 shadow-sm"
                    onClick={startEdit}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit profile
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
                      className="h-9 rounded-xl bg-blue-600 text-white hover:bg-blue-700"
                      disabled={saveBusy}
                      onClick={() => void saveProfile()}
                    >
                      {saveBusy ? 'Saving…' : 'Save'}
                    </Button>
                  </>
                )}
              </div>

              <div className="flex min-w-0 flex-1 items-center gap-5">
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-white bg-slate-200 shadow-md ring-2 ring-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}`}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                    {editing ? editName || '—' : me.name}
                  </h2>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge
                      variant="outline"
                      className="border-sky-200 bg-sky-50 text-sky-800"
                    >
                      {me.portalLabel}
                    </Badge>
                    <span className="text-xs font-medium text-slate-500">
                      {me.practitionerSubtitle}
                    </span>
                  </div>
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
                    <Label htmlFor="student-profile-name">Full name</Label>
                    <Input
                      id="student-profile-name"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="e.g. Jane Student"
                      className="h-10"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="student-profile-email">Email</Label>
                    <Input
                      id="student-profile-email"
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      placeholder="e.g. student@school.ug"
                      className="h-10"
                    />
                  </div>
                  {saveError ? (
                    <p className="text-sm text-red-600">{saveError}</p>
                  ) : null}
                </div>
              ) : null}

              <h3 className="mb-4 text-sm font-semibold text-slate-900">
                Account details
              </h3>
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
                  <dt className="font-medium text-slate-500">Member since</dt>
                  <dd className="text-slate-900">{formatDate(me.createdAt)}</dd>
                </div>
                <div className="flex flex-col gap-0.5 border-b border-slate-100 pb-4 sm:flex-row sm:justify-between">
                  <dt className="font-medium text-slate-500">Last updated</dt>
                  <dd className="text-slate-900">{formatDate(me.updatedAt)}</dd>
                </div>
              </dl>

              <h3 className="mb-4 mt-8 text-sm font-semibold text-slate-900">
                Lab activity
              </h3>
              <dl className="grid gap-4 text-sm">
                <div className="flex flex-col gap-0.5 border-b border-slate-100 pb-4 sm:flex-row sm:justify-between">
                  <dt className="font-medium text-slate-500">VR sessions started</dt>
                  <dd className="text-slate-900">{me.stats.totalLabSessions}</dd>
                </div>
                <div className="flex flex-col gap-0.5 border-b border-slate-100 pb-4 sm:flex-row sm:justify-between">
                  <dt className="font-medium text-slate-500">Virtual practicals completed</dt>
                  <dd className="text-slate-900">{me.stats.completedPracticals}</dd>
                </div>
                <div className="flex flex-col gap-0.5 border-b border-slate-100 pb-4 sm:flex-row sm:justify-between">
                  <dt className="font-medium text-slate-500">Questionnaires submitted</dt>
                  <dd className="text-slate-900">{me.stats.questionnairesSubmitted}</dd>
                </div>
                <div className="flex flex-col gap-0.5 border-b border-slate-100 pb-4 sm:flex-row sm:justify-between">
                  <dt className="font-medium text-slate-500">Labs marked complete by teacher</dt>
                  <dd className="text-slate-900">{me.stats.labsReviewedComplete}</dd>
                </div>
                <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between">
                  <dt className="font-medium text-slate-500">Total time in VR</dt>
                  <dd className="text-slate-900">
                    {formatDuration(me.stats.timeInVRSeconds)}
                  </dd>
                </div>
              </dl>

              <div className="mt-8">
                <Button
                  asChild
                  className="rounded-xl bg-blue-600 text-white hover:bg-blue-700"
                >
                  <Link href="/student/dashboard">View my labs</Link>
                </Button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
