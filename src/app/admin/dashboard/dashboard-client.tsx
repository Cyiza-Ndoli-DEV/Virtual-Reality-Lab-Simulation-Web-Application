'use client'

import Link from 'next/link'
import {
  Activity,
  ArrowRight,
  BookMarked,
  ClipboardList,
  Clock,
  FlaskConical,
  GraduationCap,
  LayoutDashboard,
  TrendingUp,
  UserCheck,
  Users,
  Zap,
} from 'lucide-react'
import { useAdminPageHeader } from '@/components/admin/admin-app-header-context'
import {
  OutcomeDonutChart,
  RoleBreakdownChart,
  SessionsTrendChart,
  TopExperimentsChart,
} from '@/components/admin/dashboard-charts'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { AppFeatureKey } from '@/lib/app-features'
import type { AdminDashboardData } from '@/lib/data/admin-dashboard'
import type { PermissionMap } from '@/lib/portal-permissions'
import { hasPermission } from '@/lib/portal-permissions'
import { cn } from '@/lib/utils'

function formatNumber(n: number) {
  return new Intl.NumberFormat('en-US').format(n)
}

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso))
}

type QuickAction = {
  label: string
  description: string
  href: string
  icon: typeof Users
  feature: AppFeatureKey
  variant?: 'default' | 'outline'
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: 'Manage users',
    description: 'Accounts & roles',
    href: '/admin/users',
    icon: Users,
    feature: 'admin.users',
    variant: 'default',
  },
  {
    label: 'Register students',
    description: 'Add learners',
    href: '/admin/students',
    icon: GraduationCap,
    feature: 'teacher.registerStudents',
    variant: 'default',
  },
  {
    label: 'Experiments',
    description: 'VR lab catalog',
    href: '/admin/experiments',
    icon: FlaskConical,
    feature: 'admin.experiments',
    variant: 'outline',
  },
  {
    label: 'Review student work',
    description: 'Questionnaires',
    href: '/admin/student-work',
    icon: ClipboardList,
    feature: 'teacher.reports',
    variant: 'outline',
  },
  {
    label: 'Subjects',
    description: 'Curriculum setup',
    href: '/admin/settings/subjects',
    icon: BookMarked,
    feature: 'admin.settings',
    variant: 'outline',
  },
]

function statusClass(status: string) {
  if (status === 'Completed') return 'bg-emerald-50 text-emerald-700 ring-emerald-200/80'
  if (status === 'In progress') return 'bg-blue-50 text-blue-700 ring-blue-200/80'
  return 'bg-amber-50 text-amber-800 ring-amber-200/80'
}

export function AdminDashboardClient({
  data,
  permissions,
  userName,
}: {
  data: AdminDashboardData
  permissions: PermissionMap
  userName: string
}) {
  useAdminPageHeader('Dashboard', data.pendingReviews > 0)

  const { stats } = data
  const visibleActions = QUICK_ACTIONS.filter((a) => {
    if (!hasPermission(permissions, a.feature)) return false
    if (
      a.feature === 'teacher.registerStudents' &&
      hasPermission(permissions, 'admin.users')
    ) {
      return false
    }
    return true
  })

  const kpis = [
    {
      label: 'Total students',
      value: formatNumber(stats.totalStudents),
      hint: 'Registered learners',
      icon: GraduationCap,
      accent: 'from-blue-500 to-blue-600',
    },
    {
      label: 'Educators',
      value: formatNumber(stats.totalTeachers),
      hint: 'Teaching staff',
      icon: UserCheck,
      accent: 'from-violet-500 to-violet-600',
    },
    {
      label: 'VR sessions',
      value: formatNumber(stats.totalSessions),
      hint: 'All time',
      icon: FlaskConical,
      accent: 'from-indigo-500 to-indigo-600',
    },
    {
      label: 'Pass rate',
      value: `${stats.passRate}%`,
      hint: 'Completed & passed',
      icon: TrendingUp,
      accent: 'from-emerald-500 to-emerald-600',
    },
    {
      label: 'Active today',
      value: formatNumber(stats.activeNow),
      hint: 'Students in VR (24h)',
      icon: Zap,
      accent: 'from-amber-500 to-orange-500',
    },
    {
      label: 'VR hours',
      value: formatNumber(stats.vrUsageHours),
      hint: 'Total time in labs',
      icon: Clock,
      accent: 'from-cyan-500 to-teal-600',
    },
    {
      label: 'Pending reviews',
      value: formatNumber(data.pendingReviews),
      hint: 'Questionnaires',
      icon: ClipboardList,
      accent: 'from-rose-500 to-pink-600',
    },
    {
      label: 'Experiments',
      value: formatNumber(data.totalExperiments),
      hint: `${formatNumber(data.activeSubjects)} active subjects`,
      icon: LayoutDashboard,
      accent: 'from-slate-600 to-slate-700',
    },
  ]

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 px-6 py-8 text-white shadow-lg sm:px-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-violet-500/15 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-200/90">
              VRSPS Admin
            </p>
            <h2 className="mt-2 font-serif text-2xl font-semibold tracking-tight sm:text-3xl">
              Welcome back, {userName.split(' ')[0] || 'Admin'}
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-300">
              Live overview from your database — students, VR sessions, pass rates, and
              reviews updated on every visit.
            </p>
          </div>
          {visibleActions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {visibleActions.slice(0, 3).map((action) => {
                const Icon = action.icon
                return (
                  <Button
                    key={action.href}
                    asChild
                    size="lg"
                    variant={action.variant === 'default' ? 'default' : 'outline'}
                    className={cn(
                      'h-10 rounded-xl border-0 px-4 shadow-md transition-transform hover:scale-[1.02] active:scale-[0.98]',
                      action.variant === 'default'
                        ? 'bg-white text-slate-900 hover:bg-blue-50'
                        : 'border border-white/25 bg-white/10 text-white backdrop-blur hover:bg-white/20'
                    )}
                  >
                    <Link href={action.href}>
                      <Icon className="mr-2 h-4 w-4" />
                      {action.label}
                    </Link>
                  </Button>
                )
              })}
            </div>
          ) : null}
        </div>
      </section>

      {/* KPI grid */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon
          return (
            <div
              key={kpi.label}
              className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div
                className={cn(
                  'absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br opacity-10 blur-2xl transition-opacity group-hover:opacity-20',
                  kpi.accent
                )}
              />
              <div className="relative flex items-start justify-between gap-3">
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm',
                    kpi.accent
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <p className="relative mt-4 text-2xl font-bold tabular-nums tracking-tight text-slate-900">
                {kpi.value}
              </p>
              <p className="relative mt-0.5 text-sm font-medium text-slate-800">
                {kpi.label}
              </p>
              <p className="relative mt-0.5 text-xs text-slate-500">{kpi.hint}</p>
            </div>
          )
        })}
      </section>

      {/* Charts row */}
      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="border-slate-200/80 shadow-sm lg:col-span-2">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <Activity className="h-4 w-4 text-blue-600" />
              VR activity — last 7 days
            </CardTitle>
            <CardDescription>
              Sessions started vs completed per day
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <SessionsTrendChart data={data.sessionsTrend} />
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 shadow-sm">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="text-slate-900">Session outcomes</CardTitle>
            <CardDescription>All-time breakdown</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <OutcomeDonutChart
              passed={data.outcomeSplit.passed}
              failed={data.outcomeSplit.failed}
              inProgress={data.outcomeSplit.inProgress}
            />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="border-slate-200/80 shadow-sm">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="text-slate-900">Users by role</CardTitle>
            <CardDescription>Current accounts in the system</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <RoleBreakdownChart data={data.roleBreakdown} />
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 shadow-sm">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="text-slate-900">Top experiments</CardTitle>
            <CardDescription>Most VR sessions</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <TopExperimentsChart data={data.topExperiments} />
          </CardContent>
        </Card>
      </section>

      {/* Quick actions + activity */}
      <section className="grid gap-6 xl:grid-cols-5">
        <Card className="border-slate-200/80 shadow-sm xl:col-span-2">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="text-slate-900">Quick actions</CardTitle>
            <CardDescription>Jump to common tasks</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 pt-4 sm:grid-cols-2 xl:grid-cols-1">
            {visibleActions.map((action) => {
              const Icon = action.icon
              return (
                <Button
                  key={action.href}
                  asChild
                  variant="outline"
                  className="h-auto w-full justify-start rounded-xl border-slate-200 bg-slate-50/50 px-4 py-3.5 text-left shadow-sm transition-all hover:border-blue-200 hover:bg-blue-50/80 hover:shadow"
                >
                  <Link href={action.href}>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-slate-900">
                        {action.label}
                      </span>
                      <span className="block text-xs font-normal text-slate-500">
                        {action.description}
                      </span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
                  </Link>
                </Button>
              )
            })}
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 shadow-sm xl:col-span-3">
          <CardHeader className="flex flex-row items-start justify-between gap-4 border-b border-slate-100">
            <div>
              <CardTitle className="text-slate-900">Recent VR activity</CardTitle>
              <CardDescription>Latest sessions from the database</CardDescription>
            </div>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="shrink-0 rounded-lg"
            >
              <Link href="/admin/users">
                View all
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {data.recentActivity.length === 0 ? (
              <p className="px-6 py-10 text-center text-sm text-slate-500">
                No sessions yet. Students will appear here after their first lab.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {data.recentActivity.map((row) => (
                  <li
                    key={row.id}
                    className="flex flex-wrap items-center gap-3 px-6 py-3.5 transition-colors hover:bg-slate-50/80"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {row.userName}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {row.experimentTitle}
                      </p>
                    </div>
                    <span className="text-xs text-slate-500">
                      {formatDateTime(row.at)}
                    </span>
                    <span
                      className={cn(
                        'rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset',
                        statusClass(row.status)
                      )}
                    >
                      {row.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Summary strip */}
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-4">
        <div className="text-sm text-slate-600">
          <span className="font-semibold text-slate-900">
            {formatNumber(stats.totalUsers)}
          </span>{' '}
          total accounts · avg{' '}
          <span className="font-semibold text-slate-900">{stats.avgWrongSteps}</span>{' '}
          wrong steps per session
        </div>
        {data.pendingReviews > 0 && hasPermission(permissions, 'teacher.reports') ? (
          <Button
            asChild
            className="rounded-xl bg-blue-600 px-5 shadow-sm hover:bg-blue-700"
          >
            <Link href="/admin/student-work">
              Review {data.pendingReviews} pending
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        ) : null}
      </section>
    </div>
  )
}
