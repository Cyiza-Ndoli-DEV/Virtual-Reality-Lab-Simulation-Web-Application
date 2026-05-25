'use client'

import { useEffect } from 'react'

type PortalRequirement = 'admin' | 'student'

async function sessionOk(require: PortalRequirement): Promise<boolean> {
  try {
    const res = await fetch('/api/auth/session', { cache: 'no-store' })
    if (!res.ok) return false
    const data = (await res.json()) as { user?: Record<string, unknown> }
    const user = data.user
    if (!user) return false
    if (require === 'admin') return Boolean(user.canAccessAdmin)
    return Boolean(user.canAccessStudent)
  } catch {
    return false
  }
}

/**
 * Re-validates the session after logout, browser back, or bfcache restore.
 * Protected layouts wrap children with this so stale cached pages cannot be used.
 */
export function SessionGuard({
  children,
  require,
}: {
  children: React.ReactNode
  require: PortalRequirement
}) {
  useEffect(() => {
    let cancelled = false

    async function verify() {
      const ok = await sessionOk(require)
      if (!cancelled && !ok) {
        window.location.replace('/login')
      }
    }

    void verify()

    const onPageShow = () => {
      void verify()
    }

    const onVisible = () => {
      if (document.visibilityState === 'visible') void verify()
    }

    window.addEventListener('pageshow', onPageShow)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      window.removeEventListener('pageshow', onPageShow)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [require])

  return children
}
