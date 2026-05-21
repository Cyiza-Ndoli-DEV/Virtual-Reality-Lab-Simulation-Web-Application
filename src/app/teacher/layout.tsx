'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'

/** All teacher routes forward into the shared admin/educator portal. */
export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (pathname === '/teacher/dashboard') {
      router.replace('/admin/dashboard')
      return
    }
    router.replace('/admin/student-work')
  }, [pathname, router])

  return <>{children}</>
}
