import {
  LAB_WORKFLOW_STATUS_META,
  type LabWorkflowStatus,
} from '@/lib/lab-workflow-status'
import { cn } from '@/lib/utils'

export function LabWorkflowStatusBadge({
  status,
  className,
}: {
  status: LabWorkflowStatus
  className?: string
}) {
  const meta = LAB_WORKFLOW_STATUS_META[status]
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold',
        meta.className,
        className
      )}
    >
      {meta.label}
    </span>
  )
}
