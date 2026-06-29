'use client'

import type { ReactNode } from 'react'
import { CheckCircle2, Clock, Star } from 'lucide-react'
import { formatDuration } from '@/lib/student-lab-status'

export interface DashboardStats {
  completedPracticals: number
  timeInVRSeconds: number
  averageGradePercent: number | null
  topPercentileLabel: string | null
}

function StatCard({
  icon,
  iconClassName,
  label,
  children,
  compact,
}: {
  icon: ReactNode
  iconClassName: string
  label: string
  children: ReactNode
  compact?: boolean
}) {
  return (
    <div
      className={
        compact
          ? 'flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm'
          : 'flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white px-5 py-4 shadow-sm'
      }
    >
      <div
        className={
          compact
            ? `flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconClassName}`
            : `flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconClassName}`
        }
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500 sm:text-[0.8125rem]">
          {label}
        </p>
        {children}
      </div>
    </div>
  )
}

export function StatsBar({
  stats,
  layout = 'row',
}: {
  stats: DashboardStats
  layout?: 'row' | 'stack'
}) {
  const containerClass =
    layout === 'stack'
      ? 'flex flex-col gap-3'
      : 'grid gap-3 sm:grid-cols-3 sm:gap-4'

  return (
    <div className={containerClass}>
      <StatCard
        icon={<CheckCircle2 className={layout === 'stack' ? 'h-4 w-4' : 'h-5 w-5'} />}
        iconClassName="bg-blue-50 text-blue-600"
        label="Completed Practicals"
        compact={layout === 'stack'}
      >
        <p
          className={
            layout === 'stack'
              ? 'text-xl font-semibold text-slate-900'
              : 'text-xl font-semibold text-slate-900 sm:text-2xl'
          }
        >
          {stats.completedPracticals}
        </p>
      </StatCard>

      <StatCard
        icon={<Clock className={layout === 'stack' ? 'h-4 w-4' : 'h-5 w-5'} />}
        iconClassName="bg-blue-50 text-blue-600"
        label="Time in VR"
        compact={layout === 'stack'}
      >
        <p
          className={
            layout === 'stack'
              ? 'text-xl font-semibold text-slate-900'
              : 'text-xl font-semibold text-slate-900 sm:text-2xl'
          }
        >
          {formatDuration(stats.timeInVRSeconds)}
        </p>
      </StatCard>

      <StatCard
        icon={<Star className={layout === 'stack' ? 'h-4 w-4' : 'h-5 w-5'} />}
        iconClassName="bg-emerald-50 text-emerald-600"
        label="Average Grade"
        compact={layout === 'stack'}
      >
        <div className="flex flex-wrap items-baseline gap-2">
          <p
            className={
              layout === 'stack'
                ? 'text-xl font-semibold text-slate-900'
                : 'text-xl font-semibold text-slate-900 sm:text-2xl'
            }
          >
            {stats.averageGradePercent !== null
              ? `${stats.averageGradePercent}%`
              : '—'}
          </p>
          {stats.topPercentileLabel ? (
            <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
              {stats.topPercentileLabel}
            </span>
          ) : null}
        </div>
      </StatCard>
    </div>
  )
}
