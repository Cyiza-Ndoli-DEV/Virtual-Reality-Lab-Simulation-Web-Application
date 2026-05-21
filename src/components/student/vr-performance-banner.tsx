'use client'

import { Scan } from 'lucide-react'

type VrSession = {
  timeTaken: number
  wrongSteps: number
  passed: boolean
  completedAt: string | null
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

export function VrPerformanceBanner({
  session,
  onReview,
}: {
  session: VrSession | null
  onReview?: () => void
}) {
  if (!session?.completedAt) return null

  return (
    <button
      type="button"
      onClick={onReview}
      className="group relative mt-8 w-full overflow-hidden rounded-2xl text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
    >
      <div
        className="absolute inset-0 bg-gradient-to-r from-slate-900/95 via-slate-800/90 to-slate-900/95"
        aria-hidden
      />
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 50%, rgba(59,130,246,0.35) 0%, transparent 50%), radial-gradient(circle at 80% 30%, rgba(148,163,184,0.25) 0%, transparent 45%)',
        }}
        aria-hidden
      />
      <div className="relative flex flex-col items-center justify-center gap-3 px-6 py-10 sm:flex-row sm:gap-4">
        <Scan className="h-8 w-8 text-white/90" />
        <div className="text-center sm:text-left">
          <p className="text-base font-semibold text-white">Review VR Performance Log</p>
          <p className="mt-1 text-sm text-slate-300">
            Time in lab: {formatDuration(session.timeTaken)}
            {session.wrongSteps > 0 ? ` · ${session.wrongSteps} correction(s)` : ''}
            {session.passed ? ' · Passed' : ''}
          </p>
        </div>
      </div>
    </button>
  )
}
