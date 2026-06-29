'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function StudentPortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[student portal]', error)
  }, [error])

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <h1 className="app-page-title">Something went wrong</h1>
      <p className="app-body-muted max-w-md">
        The student portal could not load. This is often fixed by redeploying after
        database migrations, or by signing out and back in.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button type="button" onClick={() => reset()}>
          Try again
        </Button>
        <Button type="button" variant="outline" onClick={() => window.location.assign('/login')}>
          Back to sign in
        </Button>
      </div>
      {error.digest ? (
        <p className="app-caption text-slate-400">Reference: {error.digest}</p>
      ) : null}
    </div>
  )
}
