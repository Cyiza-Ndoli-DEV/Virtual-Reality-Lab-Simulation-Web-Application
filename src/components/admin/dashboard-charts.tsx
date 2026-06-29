'use client'

import type {
  RoleBreakdownPoint,
  SessionsTrendPoint,
  TopExperimentPoint,
} from '@/lib/data/admin-dashboard'

const CHART_COLORS = [
  'var(--color-blue-600)',
  'var(--color-violet-500)',
  'var(--color-emerald-500)',
  'var(--color-amber-500)',
  'var(--color-rose-500)',
]

export function SessionsTrendChart({ data }: { data: SessionsTrendPoint[] }) {
  const max = Math.max(1, ...data.map((d) => d.sessions))
  const w = 100
  const h = 48
  const pad = 2
  const step = data.length > 1 ? (w - pad * 2) / (data.length - 1) : 0

  const sessionPoints = data
    .map((d, i) => {
      const x = pad + i * step
      const y = h - pad - (d.sessions / max) * (h - pad * 2)
      return `${x},${y}`
    })
    .join(' ')

  const completedPoints = data
    .map((d, i) => {
      const x = pad + i * step
      const y = h - pad - (d.completed / max) * (h - pad * 2)
      return `${x},${y}`
    })
    .join(' ')

  return (
    <div className="space-y-4">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="h-44 w-full text-blue-600"
        preserveAspectRatio="none"
        aria-hidden
      >
        <defs>
          <linearGradient id="sessionsFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(37 99 235)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="rgb(37 99 235)" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <polygon
          fill="url(#sessionsFill)"
          points={`${pad},${h - pad} ${sessionPoints} ${pad + (data.length - 1) * step},${h - pad}`}
        />
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={sessionPoints}
        />
        <polyline
          fill="none"
          stroke="rgb(16 185 129)"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="3 2"
          points={completedPoints}
        />
      </svg>
      <div className="flex justify-between gap-1 text-[11px] font-medium text-slate-500">
        {data.map((d) => (
          <span key={d.date} className="flex-1 text-center">
            {d.label}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap gap-4 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded-full bg-blue-600" />
          Sessions started
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded-full border border-dashed border-emerald-500 bg-emerald-500/30" />
          Completed
        </span>
      </div>
    </div>
  )
}

export function OutcomeDonutChart({
  passed,
  failed,
  inProgress,
}: {
  passed: number
  failed: number
  inProgress: number
}) {
  const total = passed + failed + inProgress
  const segments = [
    { label: 'Passed', value: passed, color: '#10b981' },
    { label: 'Ended (not passed)', value: failed, color: '#f43f5e' },
    { label: 'In progress', value: inProgress, color: '#3b82f6' },
  ]

  if (total === 0) {
    return (
      <p className="app-body-muted py-8 text-center">No sessions yet.</p>
    )
  }

  const p1 = (passed / total) * 100
  const p2 = ((passed + failed) / total) * 100
  const gradient = `conic-gradient(
    #10b981 0 ${p1}%,
    #f43f5e ${p1}% ${p2}%,
    #3b82f6 ${p2}% 100%
  )`

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-center">
      <div className="relative h-40 w-40 shrink-0">
        <div
          className="h-full w-full rounded-full shadow-inner"
          style={{ background: gradient }}
        />
        <div className="absolute inset-[18%] rounded-full bg-white shadow-sm" />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-xl font-bold text-slate-900">{total}</p>
          <p className="app-label">Sessions</p>
        </div>
      </div>
      <ul className="app-body w-full max-w-xs space-y-2.5 sm:w-auto">
        {segments.map((seg) => (
          <li key={seg.label} className="flex items-center gap-2.5">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: seg.color }}
            />
            <span className="text-slate-600">{seg.label}</span>
            <span className="ml-auto font-semibold tabular-nums text-slate-900">
              {seg.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function RoleBreakdownChart({ data }: { data: RoleBreakdownPoint[] }) {
  const max = Math.max(1, ...data.map((d) => d.count))

  return (
    <div className="space-y-3">
      {data.length === 0 ? (
        <p className="app-body-muted">No users yet.</p>
      ) : (
        data.map((row, i) => (
          <div key={row.role}>
            <div className="app-body mb-1 flex items-center justify-between">
              <span className="font-medium text-slate-700">{row.label}</span>
              <span className="tabular-nums font-semibold text-slate-900">
                {row.count}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${(row.count / max) * 100}%`,
                  backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                }}
              />
            </div>
          </div>
        ))
      )}
    </div>
  )
}

export function TopExperimentsChart({ data }: { data: TopExperimentPoint[] }) {
  const max = Math.max(1, ...data.map((d) => d.sessions))

  return (
    <div className="space-y-4">
      {data.length === 0 ? (
        <p className="app-body-muted">No VR sessions recorded yet.</p>
      ) : (
        data.map((row, i) => (
          <div key={row.id} className="flex items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[0.8125rem] font-bold text-slate-600">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[0.9375rem] font-medium text-slate-800">{row.title}</p>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-blue-600"
                  style={{ width: `${(row.sessions / max) * 100}%` }}
                />
              </div>
            </div>
            <span className="shrink-0 text-[0.9375rem] font-semibold tabular-nums text-slate-900">
              {row.sessions}
            </span>
          </div>
        ))
      )}
    </div>
  )
}
