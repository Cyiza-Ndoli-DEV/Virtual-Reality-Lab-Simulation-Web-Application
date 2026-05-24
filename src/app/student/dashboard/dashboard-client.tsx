'use client'

import { useMemo } from 'react'
import { LabCard, type LabCardData } from '@/components/student/lab-card'
import { StatsBar, type DashboardStats } from '@/components/student/stats-bar'
import type { LabStatus } from '@/lib/student-lab-status'
import type { StudentExperimentsPayload } from '@/lib/data/student-experiments'

const statusOrder: Record<LabStatus, number> = {
  active: 0,
  completed: 1,
  available: 2,
  locked: 3,
}

export function StudentDashboardClient({
  initialData,
}: {
  initialData: StudentExperimentsPayload
}) {
  const stats = initialData.stats as DashboardStats
  const labs = initialData.experiments as LabCardData[]

  const sortedLabs = useMemo(
    () =>
      [...labs].sort(
        (a, b) => (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9)
      ),
    [labs]
  )

  return (
    <div>
      <StatsBar stats={stats} />

      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">My labs</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
          After you complete a VR practical, open the post-lab questionnaire for that
          experiment and submit your written work.
        </p>
      </div>

      {sortedLabs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
          <p className="text-sm text-slate-500">No experiments are available yet.</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {sortedLabs.map((lab) => (
            <li key={lab.id} className="list-none">
              <LabCard lab={lab} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
