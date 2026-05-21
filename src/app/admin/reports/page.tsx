'use client'

import { useAdminPageHeader } from '@/components/admin/admin-app-header-context'

export default function AdminReportsPage() {
  useAdminPageHeader('Reports', false)

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8">
      <p className="text-sm text-slate-600">
        Legacy experiment reports will appear here. For post-lab questionnaires, use{' '}
        <strong>Student work</strong> in the sidebar.
      </p>
    </div>
  )
}
