'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, Headset, Lock, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ExperimentLabShell } from '@/components/student/experiment-lab-shell'
import { QuestionnaireReviewCard } from '@/components/student/questionnaire-review-card'
import { VrPerformanceBanner } from '@/components/student/vr-performance-banner'
import { MarkVrCompleteButton } from '@/components/student/mark-vr-complete-button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { LabQuizzesSection } from '@/components/student/lab-quizzes-section'
import { LabWorkflowStatusBadge } from '@/components/student/lab-workflow-status-badge'
import type { StudentQuizSummary } from '@/lib/quiz'
import type { QuestionnaireAnswers, QuestionnaireConfig } from '@/lib/questionnaire'
import type { LabWorkflowStatus } from '@/lib/lab-workflow-status'
import type { LabStatus } from '@/lib/student-lab-status'
import type { LabProgress } from '@/lib/questionnaire-display'

type ExperimentDetail = {
  experiment: {
    id: string
    title: string
    description: string
    subject: { code: string; name: string } | null
  }
  status: LabStatus
  progressPercent: number
  hasQuestionnaire: boolean
  hasReportAssignment: boolean
  hasQuizzes: boolean
  quizzes: StudentQuizSummary[]
  workflowStatus: LabWorkflowStatus
  reportWorkflowStatus: LabWorkflowStatus
  questionnaire: {
    title: string
    config: QuestionnaireConfig
    submitted: boolean
    submittedAt: string | null
    reviewStatus: 'PENDING' | 'COMPLETED' | null
    answers: QuestionnaireAnswers | null
  } | null
  report: {
    title: string
    instructions: string
    submitted: boolean
    submittedAt: string | null
    reviewStatus: 'PENDING' | 'COMPLETED' | null
    reviewedAt: string | null
    teacherFeedback: string | null
    content: string | null
  } | null
  gradeLabel: string | null
  labProgress: LabProgress
  vrSession: {
    id: string
    timeTaken: number
    wrongSteps: number
    passed: boolean
    completedAt: string | null
  } | null
}

export default function StudentExperimentPage() {
  const params = useParams()
  const experimentId = typeof params.id === 'string' ? params.id : ''

  const [data, setData] = useState<ExperimentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [vrLogOpen, setVrLogOpen] = useState(false)

  const load = useCallback(async () => {
    if (!experimentId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/student/experiments/${experimentId}`)
      const json = await res.json().catch(() => ({}))
      if (res.ok) setData(json as ExperimentDetail)
    } finally {
      setLoading(false)
    }
  }, [experimentId])

  useEffect(() => {
    queueMicrotask(() => {
      void load()
    })
  }, [load])

  return (
    <ExperimentLabShell experimentId={experimentId}>
      {loading ? (
        <p className="app-body-muted">Loading lab details…</p>
      ) : !data ? (
        <p className="app-body-muted">Experiment not found.</p>
      ) : (
        <ExperimentDetailContent
          data={data}
          vrLogOpen={vrLogOpen}
          setVrLogOpen={setVrLogOpen}
          onLabUpdated={() => void load()}
        />
      )}
    </ExperimentLabShell>
  )
}

function ExperimentDetailContent({
  data,
  vrLogOpen,
  setVrLogOpen,
  onLabUpdated,
}: {
  data: ExperimentDetail
  vrLogOpen: boolean
  setVrLogOpen: (v: boolean) => void
  onLabUpdated: () => void
}) {
  const {
    experiment,
    status,
    questionnaire,
    report,
    vrSession,
    workflowStatus,
    reportWorkflowStatus,
    labProgress,
  } = data
  const submitted = questionnaire?.submitted ?? false
  const reportSubmitted = report?.submitted ?? false
  const answers = (questionnaire?.answers ?? {}) as QuestionnaireAnswers
  const teacherCompleted = questionnaire?.reviewStatus === 'COMPLETED'
  const reportTeacherCompleted = report?.reviewStatus === 'COMPLETED'
  const vrCompleted = labProgress.virtualPractical === 'completed'
  const vrMarkProps = {
    experimentId: experiment.id,
    vrCompleted,
    onCompleted: onLabUpdated,
  }

  const quizCards = data.hasQuizzes ? (
    <LabQuizzesSection
      quizzes={data.quizzes}
      experimentId={experiment.id}
      disabled={!vrCompleted}
      embedded
    />
  ) : null

  function PostLabGrid({ children }: { children: React.ReactNode }) {
    const items = Array.isArray(children)
      ? children.filter(Boolean)
      : [children].filter(Boolean)
    if (items.length === 0) return null
    return <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{items}</div>
  }

  if (status === 'locked') {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <Lock className="mx-auto h-10 w-10 text-slate-300" />
        <p className="app-body mt-4">This lab is not available yet.</p>
      </div>
    )
  }

  if (reportSubmitted && report && !submitted) {
    return (
      <>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <LabWorkflowStatusBadge status={reportWorkflowStatus} />
        </div>
        {reportTeacherCompleted ? (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-900">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="app-card-title">Lab report reviewed</p>
              <p className="app-body mt-1 text-emerald-800">
                Your teacher has reviewed your written report.
              </p>
            </div>
          </div>
        ) : (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="app-card-title">Report awaiting review</p>
              <p className="app-body mt-1 text-amber-800">
                Your lab report was submitted and is pending teacher review.
              </p>
            </div>
          </div>
        )}
        <SubmittedReportCard report={report} experimentId={experiment.id} />
        {quizCards ? <PostLabGrid>{quizCards}</PostLabGrid> : null}
        <VrPerformanceBanner
          session={vrSession}
          onReview={() => setVrLogOpen(true)}
        />
        <VrLogDialog
          open={vrLogOpen}
          onOpenChange={setVrLogOpen}
          session={vrSession}
          experimentTitle={experiment.title}
        />
      </>
    )
  }

  if (submitted && questionnaire) {
    return (
      <>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <LabWorkflowStatusBadge status={workflowStatus} />
          {reportSubmitted ? (
            <LabWorkflowStatusBadge status={reportWorkflowStatus} />
          ) : null}
        </div>

        {teacherCompleted ? (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-900">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="app-card-title">Lab marked complete</p>
              <p className="app-body mt-1 text-emerald-800">
                Your teacher has reviewed and completed this lab. Your questionnaire is
                locked below.
              </p>
            </div>
          </div>
        ) : (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="app-card-title">Awaiting teacher review</p>
              <p className="app-body mt-1 text-amber-800">
                Your questionnaire was submitted and is pending. You can review your
                answers below while your teacher marks the lab complete.
              </p>
            </div>
          </div>
        )}

        <QuestionnaireReviewCard
          config={questionnaire.config}
          answers={answers}
          workflowStatus={workflowStatus}
          experimentId={data.experiment.id}
        />

        {reportSubmitted && report ? (
          <div className="mt-6">
            <SubmittedReportCard report={report} experimentId={experiment.id} />
          </div>
        ) : null}

        {report && !reportSubmitted && vrCompleted ? (
          <PostLabGrid>
            <PendingReportCta experimentId={experiment.id} />
            {quizCards}
          </PostLabGrid>
        ) : (
          quizCards ? <PostLabGrid>{quizCards}</PostLabGrid> : null
        )}

        <VrPerformanceBanner
          session={vrSession}
          onReview={() => setVrLogOpen(true)}
        />

        <VrLogDialog
          open={vrLogOpen}
          onOpenChange={setVrLogOpen}
          session={vrSession}
          experimentTitle={experiment.title}
        />
      </>
    )
  }

  if (status === 'active') {
    return (
      <>
        <div className="mb-6 rounded-2xl border-2 border-blue-200 bg-blue-50/50 p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Play className="h-6 w-6 fill-current" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="app-card-title">VR session in progress</p>
              <p className="app-body mt-2 text-slate-600">
                Continue this practical on the <strong>VRSPS VR headset application</strong>.
                The web portal cannot start or control VR directly — your progress syncs when
                you use the lab app.
              </p>
              <p className="mt-3 text-[0.9375rem] font-medium text-blue-700">
                Progress: {data.progressPercent}%
              </p>
              <div className="mt-5 border-t border-blue-200/80 pt-5">
                <MarkVrCompleteButton {...vrMarkProps} />
              </div>
            </div>
          </div>
        </div>

        <PostLabGrid>
          {questionnaire ? (
            <PendingQuestionnaireCta
              experimentId={data.experiment.id}
              disabled={!vrCompleted}
            />
          ) : null}
          {report && !reportSubmitted ? (
            <PendingReportCta
              experimentId={data.experiment.id}
              disabled={!vrCompleted}
            />
          ) : null}
          {quizCards}
        </PostLabGrid>
      </>
    )
  }

  if (
    status === 'completed' &&
    report &&
    !reportSubmitted &&
    (!questionnaire || submitted)
  ) {
    return (
      <>
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <p className="app-body text-amber-950">
            You have finished the virtual practical. Write your lab report while your
            observations are still fresh.
          </p>
        </div>
        <div className="mb-4">
          <LabWorkflowStatusBadge status={reportWorkflowStatus} />
        </div>
        <PostLabGrid>
          <PendingReportCta experimentId={data.experiment.id} />
          {quizCards}
        </PostLabGrid>
        <VrPerformanceBanner
          session={vrSession}
          onReview={() => setVrLogOpen(true)}
        />
        <VrLogDialog
          open={vrLogOpen}
          onOpenChange={setVrLogOpen}
          session={vrSession}
          experimentTitle={experiment.title}
        />
      </>
    )
  }

  if (
    status === 'completed' &&
    questionnaire &&
    !submitted
  ) {
    return (
      <>
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <p className="app-body text-amber-950">
            You have finished the virtual practical. Complete the post-lab questionnaire
            below while your observations are still fresh.
          </p>
        </div>
        <div className="mb-4">
          <LabWorkflowStatusBadge status={workflowStatus} />
        </div>
        <PostLabGrid>
          <PendingQuestionnaireCta experimentId={data.experiment.id} />
          {report && !reportSubmitted ? (
            <PendingReportCta experimentId={data.experiment.id} />
          ) : null}
          {quizCards}
        </PostLabGrid>
        <VrPerformanceBanner
          session={vrSession}
          onReview={() => setVrLogOpen(true)}
        />
        <VrLogDialog
          open={vrLogOpen}
          onOpenChange={setVrLogOpen}
          session={vrSession}
          experimentTitle={experiment.title}
        />
      </>
    )
  }

  return (
    <>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Headset className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="app-card-title">Start in the VR lab app</p>
            <p className="app-body mt-2 text-slate-600">
              {experiment.description}
            </p>
            <p className="app-body-muted mt-4">
              Open the <strong>VRSPS VR application</strong> on your headset or lab PC to run
              this practical. When you are done, mark it complete here, then fill in the
              questionnaire.
            </p>
            <div className="mt-5 border-t border-slate-100 pt-5">
              <MarkVrCompleteButton {...vrMarkProps} />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <LabWorkflowStatusBadge status={workflowStatus} />
      </div>

      {!data.hasQuestionnaire && !data.hasReportAssignment ? (
        <p className="app-body-muted mt-4">
          Post-lab work (questionnaire or written report) has not been set up for this
          experiment yet.
        </p>
      ) : null}
      <PostLabGrid>
        {data.hasQuestionnaire ? (
          <PendingQuestionnaireCta
            experimentId={data.experiment.id}
            disabled={!vrCompleted}
          />
        ) : null}
        {data.hasReportAssignment && !reportSubmitted ? (
          <PendingReportCta
            experimentId={data.experiment.id}
            disabled={!vrCompleted}
          />
        ) : null}
        {quizCards}
      </PostLabGrid>
    </>
  )
}

function PendingReportCta({
  experimentId,
  disabled,
}: {
  experimentId: string
  disabled?: boolean
}) {
  return (
    <div className="flex h-full w-full flex-col rounded-2xl border border-slate-200 bg-white p-6">
      <p className="app-card-title">Written lab report</p>
      <p className="app-body-muted mt-1.5">
        {disabled
          ? 'Available after you complete the virtual practical in VR.'
          : 'Submit your report about the VR practical you completed.'}
      </p>
      <Button
        asChild={!disabled}
        className="mt-5 h-10 rounded-xl bg-teal-600 text-[0.9375rem] text-white hover:bg-teal-700"
        disabled={disabled}
      >
        {disabled ? (
          <span>Write lab report</span>
        ) : (
          <Link href={`/student/experiments/${experimentId}/report`}>
            Write lab report
          </Link>
        )}
      </Button>
    </div>
  )
}

function SubmittedReportCard({
  report,
  experimentId,
}: {
  report: NonNullable<ExperimentDetail['report']>
  experimentId: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="app-card-title">{report.title}</p>
      {report.teacherFeedback ? (
        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
          <p className="app-caption font-semibold text-blue-800">Teacher feedback</p>
          <p className="app-body mt-1 whitespace-pre-wrap text-blue-900">
            {report.teacherFeedback}
          </p>
        </div>
      ) : null}
      <p className="app-body mt-4 whitespace-pre-wrap">
        {report.content}
      </p>
      <Button asChild variant="outline" size="sm" className="mt-4">
        <Link href={`/student/experiments/${experimentId}/report`}>View report</Link>
      </Button>
    </div>
  )
}

function PendingQuestionnaireCta({
  experimentId,
  disabled,
}: {
  experimentId: string
  disabled?: boolean
}) {
  return (
    <div className="flex h-full w-full flex-col rounded-2xl border border-slate-200 bg-white p-6">
      <p className="app-card-title">Post-lab questionnaire</p>
      <p className="app-body-muted mt-1.5">
        {disabled
          ? 'Available after you complete the virtual practical in VR.'
          : 'Record your design, results, and analysis for this practical.'}
      </p>
      <Button
        asChild={!disabled}
        className="mt-5 h-10 rounded-xl bg-blue-600 text-[0.9375rem] text-white hover:bg-blue-700"
        disabled={disabled}
      >
        {disabled ? (
          <span>Complete questionnaire</span>
        ) : (
          <Link href={`/student/experiments/${experimentId}/questionnaire`}>
            Complete questionnaire
          </Link>
        )}
      </Button>
    </div>
  )
}

function VrLogDialog({
  open,
  onOpenChange,
  session,
  experimentTitle,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  session: ExperimentDetail['vrSession']
  experimentTitle: string
}) {
  if (!session) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>VR performance log — {experimentTitle}</DialogTitle>
        </DialogHeader>
        <dl className="app-body grid gap-3">
          <div className="flex justify-between border-b border-slate-100 py-2">
            <dt className="text-slate-500">Time in lab</dt>
            <dd className="font-medium text-slate-900">{session.timeTaken}s</dd>
          </div>
          <div className="flex justify-between border-b border-slate-100 py-2">
            <dt className="text-slate-500">Wrong steps</dt>
            <dd className="font-medium text-slate-900">{session.wrongSteps}</dd>
          </div>
          <div className="flex justify-between py-2">
            <dt className="text-slate-500">Result</dt>
            <dd className="font-medium text-slate-900">
              {session.passed ? 'Passed' : 'Needs review'}
            </dd>
          </div>
        </dl>
      </DialogContent>
    </Dialog>
  )
}
