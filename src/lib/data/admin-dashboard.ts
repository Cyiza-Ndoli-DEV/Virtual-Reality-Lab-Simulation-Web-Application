import prisma from '@/lib/prisma'
import { getAdminStats, type AdminStats } from './admin-stats'

export type SessionsTrendPoint = {
  date: string
  label: string
  sessions: number
  completed: number
}

export type RoleBreakdownPoint = {
  role: string
  label: string
  count: number
}

export type TopExperimentPoint = {
  id: string
  title: string
  sessions: number
}

export type RecentActivityRow = {
  id: string
  at: string
  userName: string
  experimentTitle: string
  status: 'In progress' | 'Completed' | 'Ended'
}

export type AdminDashboardData = {
  stats: AdminStats
  sessionsTrend: SessionsTrendPoint[]
  outcomeSplit: { passed: number; failed: number; inProgress: number }
  roleBreakdown: RoleBreakdownPoint[]
  topExperiments: TopExperimentPoint[]
  pendingReviews: number
  totalExperiments: number
  activeSubjects: number
  recentActivity: RecentActivityRow[]
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admins',
  TEACHER: 'Educators',
  STUDENT: 'Students',
}

function roleLabel(code: string) {
  return ROLE_LABELS[code] ?? code
}

function buildLast7DayBuckets(): { date: string; label: string }[] {
  const buckets: { date: string; label: string }[] = []
  const fmt = new Intl.DateTimeFormat('en-US', { weekday: 'short' })
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - i)
    buckets.push({
      date: d.toISOString().slice(0, 10),
      label: fmt.format(d),
    })
  }
  return buckets
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const buckets = buildLast7DayBuckets()
  const rangeStart = new Date(buckets[0].date)
  rangeStart.setHours(0, 0, 0, 0)

  const [
    stats,
    trendSessions,
    passedCount,
    failedCount,
    inProgressCount,
    roleGroups,
    experimentGroups,
    pendingReviews,
    totalExperiments,
    activeSubjects,
    recentRows,
  ] = await Promise.all([
    getAdminStats(),
    prisma.experimentSession.findMany({
      where: { startedAt: { gte: rangeStart } },
      select: { startedAt: true, completedAt: true },
    }),
    prisma.experimentSession.count({
      where: { passed: true, completedAt: { not: null } },
    }),
    prisma.experimentSession.count({
      where: { passed: false, completedAt: { not: null } },
    }),
    prisma.experimentSession.count({ where: { completedAt: null } }),
    prisma.user.groupBy({
      by: ['role'],
      _count: { _all: true },
    }),
    prisma.experimentSession.groupBy({
      by: ['experimentId'],
      _count: { _all: true },
    }),
    prisma.questionnaireSubmission.count({
      where: { reviewStatus: 'PENDING' },
    }),
    prisma.experiment.count(),
    prisma.subject.count({ where: { status: 'ACTIVE' } }),
    prisma.experimentSession.findMany({
      take: 8,
      orderBy: { startedAt: 'desc' },
      select: {
        id: true,
        startedAt: true,
        completedAt: true,
        passed: true,
        student: { select: { name: true } },
        experiment: { select: { title: true } },
      },
    }),
  ])

  const trendMap = new Map(
    buckets.map((b) => [b.date, { sessions: 0, completed: 0 }])
  )
  for (const s of trendSessions) {
    const key = s.startedAt.toISOString().slice(0, 10)
    const row = trendMap.get(key)
    if (!row) continue
    row.sessions += 1
    if (s.completedAt) row.completed += 1
  }

  const sessionsTrend: SessionsTrendPoint[] = buckets.map((b) => {
    const row = trendMap.get(b.date) ?? { sessions: 0, completed: 0 }
    return { ...b, ...row }
  })

  const experimentIds = experimentGroups.map((g) => g.experimentId)
  const experiments =
    experimentIds.length > 0
      ? await prisma.experiment.findMany({
          where: { id: { in: experimentIds } },
          select: { id: true, title: true },
        })
      : []
  const titleById = new Map(experiments.map((e) => [e.id, e.title]))

  const topExperiments: TopExperimentPoint[] = experimentGroups
    .map((g) => ({
      id: g.experimentId,
      title: titleById.get(g.experimentId) ?? 'Unknown experiment',
      sessions: g._count._all,
    }))
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 5)

  const roleBreakdown: RoleBreakdownPoint[] = roleGroups
    .map((g) => ({
      role: g.role,
      label: roleLabel(g.role),
      count: g._count._all,
    }))
    .sort((a, b) => b.count - a.count)

  const recentActivity: RecentActivityRow[] = recentRows.map((r) => ({
    id: r.id,
    at: r.startedAt.toISOString(),
    userName: r.student.name,
    experimentTitle: r.experiment.title,
    status: r.completedAt
      ? r.passed
        ? 'Completed'
        : 'Ended'
      : 'In progress',
  }))

  return {
    stats,
    sessionsTrend,
    outcomeSplit: {
      passed: passedCount,
      failed: failedCount,
      inProgress: inProgressCount,
    },
    roleBreakdown,
    topExperiments,
    pendingReviews,
    totalExperiments,
    activeSubjects,
    recentActivity,
  }
}
