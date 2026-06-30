'use client'

import Link from 'next/link'
import { LabWorkflowStatusBadge } from '@/components/student/lab-workflow-status-badge'
import type { QuestionnaireAnswers, QuestionnaireConfig } from '@/lib/questionnaire'
import { isPreLabAcknowledgementOnly } from '@/lib/questionnaire'
import type { LabWorkflowStatus } from '@/lib/lab-workflow-status'
import {
  answerTextForSection,
  questionnaireItemLabel,
  splitConfigForReview,
} from '@/lib/questionnaire-display'
import { cn } from '@/lib/utils'

function ReadOnlyAnswer({ text, className }: { text: string; className?: string }) {
  if (!text.trim()) {
    return (
      <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-[0.9375rem] italic text-slate-400">
        No response recorded.
      </p>
    )
  }
  return (
    <div
      className={cn(
        'rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-[0.9375rem] leading-relaxed text-slate-700',
        className
      )}
    >
      {text.split('\n').map((line, i) => (
        <p key={i} className={i > 0 ? 'mt-2' : undefined}>
          {line}
        </p>
      ))}
    </div>
  )
}

export function QuestionnaireReviewCard({
  config,
  answers,
  itemIndex = 0,
  showFooter = true,
  experimentId,
  workflowStatus = 'pending',
  contextOnly = false,
}: {
  config: QuestionnaireConfig
  answers: QuestionnaireAnswers
  itemIndex?: number
  showFooter?: boolean
  experimentId?: string
  workflowStatus?: LabWorkflowStatus
  /** Read-only pre-lab briefing — no student-written responses shown. */
  contextOnly?: boolean
}) {
  const showResponses =
    !contextOnly && !isPreLabAcknowledgementOnly(answers)
  const { design, tasks } = splitConfigForReview(config)

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-4">
        <p className="app-card-title">
          {contextOnly ? config.title : questionnaireItemLabel(itemIndex)}
        </p>
        <p className="app-body-muted mt-1">
          {contextOnly
            ? 'Pre-lab briefing — scenario and task for the VR practical.'
            : 'Complete all sections below after finishing the VR lab practical.'}
        </p>
      </div>

      <div className="space-y-8 px-6 py-6">
        {design ? (
          <div className="space-y-4">
            <p className="app-label text-blue-600">Scenario</p>
            <p className="app-body text-slate-800">{design.context}</p>
            {design.materials.length > 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50/90 px-4 py-3">
                <p className="app-body font-medium text-slate-800">Materials provided:</p>
                <ul className="app-body mt-2 list-disc space-y-1 pl-5">
                  {design.materials.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div>
              <p className="app-label text-blue-600">Task</p>
              <p className="text-[0.9375rem] font-semibold text-slate-900">
                <span>{design.label}</span> {design.taskPrompt}
              </p>
              {design.requirementsNote ? (
                <p className="mt-1 text-[0.9375rem] italic text-slate-500">
                  ({design.requirementsNote})
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        {showResponses && tasks.length > 0 ? (
          <div className="space-y-5">
            <p className="app-label text-blue-600">Task &amp; responses</p>
            {design ? (
              <div>
                <div className="mt-3">
                  <ReadOnlyAnswer text={answerTextForSection(design, answers)} />
                </div>
              </div>
            ) : null}
            {tasks.map((section) => (
              <div key={section.id}>
                <p className="text-[0.9375rem] font-semibold text-slate-900">
                  <span>{section.label}</span>{' '}
                  {section.type === 'record'
                    ? section.instruction
                    : section.prompt}
                </p>
                {section.type === 'record' && section.requirementsNote ? (
                  <p className="mt-1 text-[0.9375rem] italic text-slate-500">
                    ({section.requirementsNote})
                  </p>
                ) : null}
                <div className="mt-3">
                  <ReadOnlyAnswer
                    text={answerTextForSection(section, answers)}
                    className={
                      section.type === 'analyse' &&
                      answerTextForSection(section, answers).includes('=')
                        ? 'font-mono text-[13px]'
                        : undefined
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {showFooter ? (
        <div className="flex items-center justify-between border-t border-slate-100 px-6 py-3">
          <LabWorkflowStatusBadge status={workflowStatus} />
          {experimentId ? (
            <Link
              href={`/student/experiments/${experimentId}/questionnaire`}
              className="text-[0.9375rem] font-semibold text-blue-600 hover:text-blue-700"
            >
              View briefing
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
