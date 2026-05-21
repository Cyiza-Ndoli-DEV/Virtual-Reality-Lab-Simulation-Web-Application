/** Post-experiment questionnaire section definitions (stored as JSON on ExperimentQuestionnaire). */

export type GradingCriterion = {
  code: string
  label?: string
}

export type QuestionnaireSectionBase = {
  id: string
  label: string
  sortOrder: number
}

export type DesignSection = QuestionnaireSectionBase & {
  type: 'design'
  contextHeading: string
  context: string
  materials: string[]
  taskPrompt: string
  requirementsNote: string
  requiredComponents: string[]
  responseMode: 'single' | 'structured'
}

export type RecordSection = QuestionnaireSectionBase & {
  type: 'record'
  instruction: string
  requirementsNote: string
  minReadings: number
}

export type AnalyseSection = QuestionnaireSectionBase & {
  type: 'analyse'
  prompt: string
  gradingCriteria: GradingCriterion[]
}

export type QuestionnaireSection = DesignSection | RecordSection | AnalyseSection

export type QuestionnaireConfig = {
  title: string
  sections: QuestionnaireSection[]
}

export type DesignAnswer =
  | { mode: 'single'; text: string }
  | { mode: 'structured'; components: Record<string, string> }

export type TextAnswer = { text: string }

export type QuestionnaireAnswers = Record<
  string,
  DesignAnswer | TextAnswer
>

export type SectionScores = Record<
  string,
  { basisCode?: string; score?: string }
>

export type QuestionnaireScores = Record<string, SectionScores>

function newId() {
  return `sec-${Math.random().toString(36).slice(2, 10)}`
}

/** Empty skeleton for admin setup (fields use UI placeholders, not prefilled text). */
export function emptyQuestionnaireConfig(): QuestionnaireConfig {
  return {
    title: '',
    sections: [
      {
        id: newId(),
        type: 'design',
        label: '(a)',
        sortOrder: 0,
        contextHeading: '',
        context: '',
        materials: [],
        taskPrompt: '',
        requirementsNote: '',
        requiredComponents: [],
        responseMode: 'structured',
      },
      {
        id: newId(),
        type: 'record',
        label: '(b)',
        sortOrder: 1,
        instruction: '',
        requirementsNote: '',
        minReadings: 0,
      },
      {
        id: newId(),
        type: 'analyse',
        label: '(c)',
        sortOrder: 2,
        prompt: '',
        gradingCriteria: [],
      },
    ],
  }
}

/** Filled example for “Load sample template” (diffusion / David scenario). */
export function sampleQuestionnaireConfig(): QuestionnaireConfig {
  return {
    title: 'Post-practical questionnaire',
    sections: [
      {
        id: newId(),
        type: 'design',
        label: '(a)',
        sortOrder: 0,
        contextHeading: 'Item',
        context:
          'In the process of making tea, David added some tea leaves into a cup of hot water and did not stir the mixture. After some time when David observed the set-up directly from above, the brown colour of tea leaves had entirely spread up to the bottom of the cup. David’s elder sister in senior six science class told him that a similar observation is true when a drop of coloured solution of potassium manganate(VII) is used instead of tea leaves and that the rate at which the purple colour spreads in water seems to be affected by the temperature of water. David wanted to prove what his sister said and has contacted you for help.',
        materials: [
          '600 cm³ of distilled water',
          '10 cm³ of BA1, which is a solution of potassium manganate(VII).',
        ],
        taskPrompt: 'Design an experiment you can carry out to help David.',
        requirementsNote:
          'Your design should include the; aim, hypothesis, variables, apparatus and materials, procedure, risks and their mitigations.',
        requiredComponents: [
          'Aim',
          'Hypothesis',
          'Variables',
          'Apparatus and materials',
          'Procedure',
          'Risks and mitigations',
        ],
        responseMode: 'structured',
      },
      {
        id: newId(),
        type: 'record',
        label: '(b)',
        sortOrder: 1,
        instruction: 'Carry out the experiment and record your results.',
        requirementsNote: 'A minimum of five readings required.',
        minReadings: 5,
      },
      {
        id: newId(),
        type: 'analyse',
        label: '(c)',
        sortOrder: 2,
        prompt: 'Analyse your results and inform David accordingly.',
        gradingCriteria: [
          { code: 'I', label: 'Interpretation' },
          { code: 'C', label: 'Communication' },
        ],
      },
    ],
  }
}

/** @deprecated Use emptyQuestionnaireConfig or sampleQuestionnaireConfig */
export function defaultQuestionnaireConfig(): QuestionnaireConfig {
  return emptyQuestionnaireConfig()
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0
}

function parseGradingCriteria(raw: unknown): GradingCriterion[] {
  if (!Array.isArray(raw)) return []
  const out: GradingCriterion[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const code = (item as { code?: unknown }).code
    if (!isNonEmptyString(code)) continue
    const label = (item as { label?: unknown }).label
    out.push({
      code: code.trim(),
      label: typeof label === 'string' && label.trim() ? label.trim() : undefined,
    })
  }
  return out
}

function parseSection(raw: unknown, index: number): QuestionnaireSection | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const id = isNonEmptyString(o.id) ? o.id.trim() : newId()
  const label = isNonEmptyString(o.label) ? o.label.trim() : `(${String.fromCharCode(97 + index)})`
  const sortOrder =
    typeof o.sortOrder === 'number' && Number.isFinite(o.sortOrder) ? o.sortOrder : index
  const type = o.type

  if (type === 'design') {
    const materials = Array.isArray(o.materials)
      ? o.materials
          .filter((m): m is string => typeof m === 'string' && m.trim().length > 0)
          .map((m) => m.trim())
      : []
    const requiredComponents = Array.isArray(o.requiredComponents)
      ? o.requiredComponents
          .filter((m): m is string => typeof m === 'string' && m.trim().length > 0)
          .map((m) => m.trim())
      : []
    const responseMode = o.responseMode === 'structured' ? 'structured' : 'single'
    if (
      !isNonEmptyString(o.context) ||
      !isNonEmptyString(o.taskPrompt) ||
      materials.length === 0
    ) {
      return null
    }
    return {
      id,
      label,
      sortOrder,
      type: 'design',
      contextHeading: isNonEmptyString(o.contextHeading) ? o.contextHeading.trim() : 'Item',
      context: o.context.trim(),
      materials,
      taskPrompt: o.taskPrompt.trim(),
      requirementsNote:
        typeof o.requirementsNote === 'string' ? o.requirementsNote.trim() : '',
      requiredComponents,
      responseMode,
    }
  }

  if (type === 'record') {
    if (!isNonEmptyString(o.instruction)) return null
    const minReadings =
      typeof o.minReadings === 'number' && o.minReadings > 0
        ? Math.floor(o.minReadings)
        : 0
    return {
      id,
      label,
      sortOrder,
      type: 'record',
      instruction: o.instruction.trim(),
      requirementsNote:
        typeof o.requirementsNote === 'string' ? o.requirementsNote.trim() : '',
      minReadings,
    }
  }

  if (type === 'analyse') {
    if (!isNonEmptyString(o.prompt)) return null
    const gradingCriteria = parseGradingCriteria(o.gradingCriteria)
    return {
      id,
      label,
      sortOrder,
      type: 'analyse',
      prompt: o.prompt.trim(),
      gradingCriteria,
    }
  }

  return null
}

export function parseQuestionnaireConfig(raw: unknown): QuestionnaireConfig | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const title = isNonEmptyString(o.title) ? o.title.trim() : ''
  if (!title) return null
  if (!Array.isArray(o.sections) || o.sections.length === 0) return null

  const sections: QuestionnaireSection[] = []
  o.sections.forEach((s, i) => {
    const parsed = parseSection(s, i)
    if (parsed) sections.push(parsed)
  })

  if (sections.length === 0) return null
  sections.sort((a, b) => a.sortOrder - b.sortOrder)
  return { title, sections }
}

export function validateAnswers(
  config: QuestionnaireConfig,
  answers: unknown
): { ok: true; data: QuestionnaireAnswers } | { ok: false; error: string } {
  if (!answers || typeof answers !== 'object') {
    return { ok: false, error: 'Answers are required' }
  }
  const raw = answers as Record<string, unknown>
  const data: QuestionnaireAnswers = {}

  for (const section of config.sections) {
    const entry = raw[section.id]
    if (!entry || typeof entry !== 'object') {
      return { ok: false, error: `Please complete section ${section.label}` }
    }
    const e = entry as Record<string, unknown>

    if (section.type === 'design') {
      if (section.responseMode === 'structured') {
        const components = e.components
        if (!components || typeof components !== 'object') {
          return { ok: false, error: `Complete all parts in section ${section.label}` }
        }
        const comp = components as Record<string, unknown>
        for (const name of section.requiredComponents) {
          const v = comp[name]
          if (typeof v !== 'string' || !v.trim()) {
            return { ok: false, error: `“${name}” is required in section ${section.label}` }
          }
        }
        const out: Record<string, string> = {}
        for (const name of section.requiredComponents) {
          out[name] = String(comp[name]).trim()
        }
        data[section.id] = { mode: 'structured', components: out }
      } else {
        const text = e.text
        if (typeof text !== 'string' || !text.trim()) {
          return { ok: false, error: `Section ${section.label} cannot be empty` }
        }
        data[section.id] = { mode: 'single', text: text.trim() }
      }
      continue
    }

    const text = e.text
    if (typeof text !== 'string' || !text.trim()) {
      return { ok: false, error: `Section ${section.label} cannot be empty` }
    }
    data[section.id] = { text: text.trim() }
  }

  return { ok: true, data }
}
