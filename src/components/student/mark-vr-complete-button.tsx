'use client'

import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useExperimentLabRefresh } from '@/components/student/experiment-lab-refresh-context'

export function MarkVrCompleteButton({
  experimentId,
  vrCompleted,
  onCompleted,
  className,
  disabled = false,
  disabledHint,
}: {
  experimentId: string
  vrCompleted: boolean
  onCompleted?: () => void
  className?: string
  disabled?: boolean
  disabledHint?: string
}) {
  const refreshLab = useExperimentLabRefresh()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (vrCompleted) {
    return (
      <div
        className={
          className ??
          'flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900'
        }
      >
        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
        <span className="font-medium">Virtual practical marked complete</span>
      </div>
    )
  }

  async function handleComplete() {
    setError('')
    setBusy(true)
    try {
      const res = await fetch(
        `/api/student/experiments/${experimentId}/complete-vr`,
        { method: 'POST' }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Could not mark complete')
        return
      }
      refreshLab?.()
      onCompleted?.()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={className}>
      <Button
        type="button"
        className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
        disabled={busy || disabled}
        onClick={() => void handleComplete()}
      >
        {busy ? 'Saving…' : 'Mark virtual practical complete'}
      </Button>
      <p className="mt-2 text-xs text-slate-500">
        {disabled && disabledHint
          ? disabledHint
          : 'Use this after you finish the lab in VR, or if you completed it outside the headset app.'}
      </p>
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
    </div>
  )
}
