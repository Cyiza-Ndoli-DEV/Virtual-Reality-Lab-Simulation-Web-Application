import type { LabProgress, ProgressStepState } from '@/lib/questionnaire-display'
import type { StudentQuizSummary } from '@/lib/quiz'

export type LabTimelineStep = {
  key: string
  label: string
  state: ProgressStepState
}

export function buildLabTimelineSteps(
  progress: LabProgress,
  quizState: ProgressStepState | null
): LabTimelineStep[] {
  const steps: LabTimelineStep[] = []

  if (progress.questionnaire !== null) {
    steps.push({
      key: 'questionnaire',
      label: 'Pre-lab briefing',
      state: progress.questionnaire,
    })
  }

  steps.push({
    key: 'virtualPractical',
    label: 'Virtual Practical',
    state: progress.virtualPractical,
  })

  if (progress.writtenReport !== null) {
    steps.push({
      key: 'writtenReport',
      label: 'Written Report',
      state: progress.writtenReport,
    })
  }

  if (quizState !== null) {
    steps.push({ key: 'quiz', label: 'Quiz', state: quizState })
  }

  let finalGradeState = progress.finalGrade
  if (quizState !== null && quizState !== 'completed') {
    finalGradeState = 'pending'
  }

  steps.push({ key: 'finalGrade', label: 'Final Grade', state: finalGradeState })

  return steps
}

export function areAllQuizzesFinished(quizzes: StudentQuizSummary[]): boolean {
  if (quizzes.length === 0) return true
  return quizzes.every(
    (q) => q.latestAttempt?.passed || (!q.canAttempt && Boolean(q.latestAttempt))
  )
}

export function deriveQuizTimelineState(
  quizzes: StudentQuizSummary[],
  vrCompleted: boolean
): ProgressStepState | null {
  if (quizzes.length === 0) return null
  if (!vrCompleted) return 'pending'
  if (areAllQuizzesFinished(quizzes)) return 'completed'
  return 'active'
}
