'use client'

import { CheckCircle2, Clock, Star } from 'lucide-react'
import { formatDuration } from '@/lib/student-lab-status'

export interface DashboardStats {
  completedPracticals: number
  timeInVRSeconds: number
  averageGradePercent: number | null
  topPercentileLabel: string | null
}

export function StatsBar({ stats }: { stats: DashboardStats }) {
  return (
    <div className="mb-8 grid gap-4 sm:grid-cols-3">
      <div className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white px-5 py-4 shadow-sm">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <CheckCircle2 className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Completed Practicals
          </p>
          <p className="text-2xl font-semibold text-slate-900">
            {stats.completedPracticals}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white px-5 py-4 shadow-sm">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <Clock className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Time in VR
          </p>
          <p className="text-2xl font-semibold text-slate-900">
            {formatDuration(stats.timeInVRSeconds)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white px-5 py-4 shadow-sm">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
          <Star className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Average Grade
          </p>
          <div className="flex flex-wrap items-baseline gap-2">
            <p className="text-2xl font-semibold text-slate-900">
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
        </div>
      </div>
    </div>
  )
}
