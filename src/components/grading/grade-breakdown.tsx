import type { FinalGradeBreakdown } from '@/lib/experiment-grading'
import { letterGradeFromPercent } from '@/lib/letter-grades'
import { cn } from '@/lib/utils'

export function GradeBreakdown({
  breakdown,
  className,
  title = 'Final grade breakdown',
}: {
  breakdown: FinalGradeBreakdown
  className?: string
  title?: string
}) {
  if (breakdown.components.length === 0) {
    return null
  }

  const letterInfo =
    breakdown.isComplete && breakdown.percentage !== null
      ? letterGradeFromPercent(breakdown.percentage)
      : null

  return (
    <section
      className={cn(
        'rounded-xl border border-slate-200 bg-white p-4 shadow-sm',
        className
      )}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="app-section-title">{title}</h3>
        <p className="text-sm font-semibold text-slate-900">
          {breakdown.isComplete ? (
            <>
              {letterInfo ? (
                <span className="text-blue-700">{letterInfo.letter}</span>
              ) : null}
              <span className="ml-2">
                {breakdown.totalAwarded} / {breakdown.totalMax}
              </span>
              {breakdown.percentage !== null ? (
                <span className="ml-2 text-slate-600">({breakdown.percentage}%)</span>
              ) : null}
            </>
          ) : (
            <span className="text-slate-500">
              {breakdown.totalAwarded} / {breakdown.gradedMax || breakdown.totalMax}{' '}
              <span className="font-normal">(partial)</span>
            </span>
          )}
        </p>
      </div>

      <ul className="mt-4 space-y-2">
        {breakdown.components.map((component) => (
          <li
            key={component.key}
            className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2 text-sm"
          >
            <span className="font-medium text-slate-700">{component.label}</span>
            <span className="tabular-nums text-slate-900">
              {component.graded ? (
                <>
                  {component.awarded ?? 0} / {component.max}
                </>
              ) : (
                <span className="text-slate-400">Pending / {component.max}</span>
              )}
            </span>
          </li>
        ))}
      </ul>

      {letterInfo ? (
        <p className="app-caption mt-3 text-slate-600">
          Grade point {letterInfo.gradePoint} · {letterInfo.interpretation}
        </p>
      ) : null}

      {!breakdown.isComplete ? (
        <p className="app-caption mt-3 text-slate-500">
          Quiz marks are scored automatically. Allocate report marks to calculate the
          final grade.
        </p>
      ) : null}
    </section>
  )
}
