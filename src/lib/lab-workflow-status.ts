/** Questionnaire workflow on the student lab (not VR session status). */

export type LabWorkflowStatus = 'todo' | 'pending' | 'completed' | 'unset'

export type QuestionnaireReviewStatus = 'PENDING' | 'COMPLETED'

export function deriveLabWorkflowStatus(input: {
  hasQuestionnaire: boolean
  submittedAt: string | null
  reviewStatus: QuestionnaireReviewStatus | null
}): LabWorkflowStatus {
  if (!input.hasQuestionnaire) return 'unset'
  if (!input.submittedAt) return 'todo'
  if (input.reviewStatus === 'COMPLETED') return 'completed'
  return 'pending'
}

export const LAB_WORKFLOW_STATUS_META: Record<
  LabWorkflowStatus,
  { label: string; className: string }
> = {
  todo: {
    label: 'To do',
    className:
      'border-slate-200 bg-slate-100 text-slate-700',
  },
  pending: {
    label: 'Pending',
    className:
      'border-amber-200 bg-amber-50 text-amber-800',
  },
  completed: {
    label: 'Completed',
    className:
      'border-emerald-200 bg-emerald-50 text-emerald-800',
  },
  unset: {
    label: 'Not set up',
    className:
      'border-slate-200 bg-slate-50 text-slate-500',
  },
}
