import type {
  DesignSection,
  QuestionnaireAnswers,
  QuestionnaireConfig,
  QuestionnaireSection,
} from '@/lib/questionnaire'

export type ProgressStepState = 'completed' | 'active' | 'pending'

export function answerTextForSection(
  section: QuestionnaireSection,
  answers: QuestionnaireAnswers | null | undefined
): string {
  if (!answers) return ''
  const entry = answers[section.id]
  if (!entry) return ''

  if (section.type === 'design') {
    if ('mode' in entry && entry.mode === 'structured') {
      return section.requiredComponents
        .map((name) => {
          const text = entry.components[name]?.trim()
          return text ? `${name}: ${text}` : ''
        })
        .filter(Boolean)
        .join('\n\n')
    }
    if ('mode' in entry && entry.mode === 'single') {
      return entry.text
    }
  }

  if ('text' in entry) return entry.text
  return ''
}

export function deriveLabProgress(input: {
  vrCompleted: boolean
  vrActive: boolean
  questionnaireSubmitted: boolean
  questionnaireReviewed?: boolean
  hasQuestionnaire: boolean
  hasFinalGrade: boolean
}): {
  virtualPractical: ProgressStepState
  questionnaire: ProgressStepState
  finalGrade: ProgressStepState
} {
  const virtualPractical: ProgressStepState = input.vrActive
    ? 'active'
    : input.vrCompleted
      ? 'completed'
      : 'pending'

  let questionnaire: ProgressStepState = 'pending'
  if (input.questionnaireReviewed) {
    questionnaire = 'completed'
  } else if (input.questionnaireSubmitted) {
    questionnaire = 'active'
  } else if (input.vrCompleted && input.hasQuestionnaire) {
    questionnaire = 'active'
  }

  const finalGrade: ProgressStepState =
    input.questionnaireReviewed || input.hasFinalGrade ? 'completed' : 'pending'

  return { virtualPractical, questionnaire, finalGrade }
}

export function questionnaireItemLabel(index: number): string {
  return `Item ${index + 1}`
}

export function splitConfigForReview(config: QuestionnaireConfig) {
  const sections = [...config.sections].sort((a, b) => a.sortOrder - b.sortOrder)
  const design = sections.find((s): s is DesignSection => s.type === 'design')
  const tasks = sections.filter((s) => s.type !== 'design')
  return { design, tasks, sections }
}
