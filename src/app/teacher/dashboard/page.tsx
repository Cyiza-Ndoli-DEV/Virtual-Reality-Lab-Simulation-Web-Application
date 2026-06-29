'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/** Educators use the same portal as admins; redirect to the shared dashboard. */
export default function TeacherDashboardRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/admin/dashboard')
  }, [router])

  return (
    <p className="app-body-muted">Redirecting to the educator portal…</p>
  )
}
