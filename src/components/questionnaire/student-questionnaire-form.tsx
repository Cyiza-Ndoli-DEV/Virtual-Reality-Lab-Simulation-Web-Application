'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type {
  DesignSection,
  QuestionnaireAnswers,
  QuestionnaireConfig,
  QuestionnaireSection,
} from '@/lib/questionnaire'

type Props = {
  config: QuestionnaireConfig
  initialAnswers?: QuestionnaireAnswers | null
  readOnly?: boolean
  onSubmit?: (answers: QuestionnaireAnswers) => Promise<void>
}

function LinedPaperArea({
  id,
  value,
  onChange,
  readOnly,
  rows = 14,
  placeholder,
}: {
  id: string
  value: string
  onChange: (v: string) => void
  readOnly?: boolean
  rows?: number
  placeholder?: string
}) {
  return (
    <div className="relative rounded-lg border border-slate-300 bg-[linear-gradient(transparent_1.65rem,#e2e8f0_1.65rem)] bg-[length:100%_1.65rem] bg-slate-50/90 p-3 pt-2">
      <Textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        rows={rows}
        placeholder={placeholder}
        className="min-h-[220px] resize-y border-0 bg-transparent shadow-none focus-visible:ring-0"
      />
    </div>
  )
}

function DesignSectionView({
  section,
  answers,
  setAnswers,
  readOnly,
}: {
  section: DesignSection
  answers: QuestionnaireAnswers
  setAnswers: React.Dispatch<React.SetStateAction<QuestionnaireAnswers>>
  readOnly?: boolean
}) {
  const current = answers[section.id]

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
          {section.contextHeading}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-800">{section.context}</p>
      </div>

      <div>
        <p className="text-sm font-medium text-slate-800">You are provided with;</p>
        <ul className="mt-2 list-disc space-y-1 pl-6 text-sm text-slate-800">
          {section.materials.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-800">Task</h3>
        <p className="mt-1 text-sm text-slate-800">
          <span className="font-medium">{section.label}</span> {section.taskPrompt}
        </p>
        {section.requirementsNote ? (
          <p className="mt-1 text-sm italic text-slate-600">({section.requirementsNote})</p>
        ) : null}
      </div>

      {section.responseMode === 'structured' ? (
        <div className="space-y-4">
          {section.requiredComponents.map((name) => {
            const comp =
              current && 'components' in current && current.mode === 'structured'
                ? current.components[name] ?? ''
                : ''
            return (
              <div key={name} className="grid gap-1.5">
                <Label htmlFor={`${section.id}-${name}`}>{name}</Label>
                <Textarea
                  id={`${section.id}-${name}`}
                  value={comp}
                  readOnly={readOnly}
                  onChange={(e) => {
                    const text = e.target.value
                    setAnswers((prev) => {
                      const prevEntry = prev[section.id]
                      const components =
                        prevEntry && 'components' in prevEntry && prevEntry.mode === 'structured'
                          ? { ...prevEntry.components }
                          : {}
                      components[name] = text
                      return {
                        ...prev,
                        [section.id]: { mode: 'structured', components },
                      }
                    })
                  }}
                  rows={3}
                  className="min-h-[72px] resize-y"
                />
              </div>
            )
          })}
        </div>
      ) : (
        <LinedPaperArea
          id={section.id}
          value={
            current &&
            'text' in current &&
            (!('mode' in current) || current.mode === 'single')
              ? current.text
              : ''
          }
          readOnly={readOnly}
          onChange={(text) =>
            setAnswers((prev) => ({
              ...prev,
              [section.id]: { mode: 'single', text },
            }))
          }
          placeholder="Write your experimental design here…"
        />
      )}
    </section>
  )
}

function GenericSectionView({
  section,
  answers,
  setAnswers,
  readOnly,
}: {
  section: QuestionnaireSection
  answers: QuestionnaireAnswers
  setAnswers: React.Dispatch<React.SetStateAction<QuestionnaireAnswers>>
  readOnly?: boolean
}) {
  if (section.type === 'design') {
    return (
      <DesignSectionView
        section={section}
        answers={answers}
        setAnswers={setAnswers}
        readOnly={readOnly}
      />
    )
  }

  const current = answers[section.id]
  const text = current && 'text' in current ? current.text : ''

  const heading =
    section.type === 'record' ? section.instruction : section.prompt
  const note =
    section.type === 'record' ? section.requirementsNote : undefined

  return (
    <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm text-slate-800">
        <span className="font-medium">{section.label}</span> {heading}
      </p>
      {note ? <p className="text-sm italic text-slate-600">({note})</p> : null}
      <LinedPaperArea
        id={section.id}
        value={text}
        readOnly={readOnly}
        onChange={(v) =>
          setAnswers((prev) => ({
            ...prev,
            [section.id]: { text: v },
          }))
        }
        rows={section.type === 'record' ? 18 : 14}
        placeholder={
          section.type === 'record'
            ? 'Record your readings and observations (table or list)…'
            : 'Write your analysis and advice to David…'
        }
      />
      {section.type === 'analyse' && section.gradingCriteria.length > 0 ? (
        <div className="mt-4 flex justify-end">
          <div className="rounded border border-slate-300 text-xs">
            <p className="border-b border-slate-300 bg-slate-100 px-2 py-1 font-medium text-slate-600">
              For Scorer&apos;s Use Only
            </p>
            <table className="border-collapse">
              <thead>
                <tr>
                  <th className="border border-slate-300 px-2 py-1 text-left font-medium text-slate-600">
                    Basis Code
                  </th>
                  {section.gradingCriteria.map((c) => (
                    <th
                      key={c.code}
                      className="border border-slate-300 px-3 py-1 font-medium text-slate-600"
                    >
                      {c.code}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-slate-300 px-2 py-2 font-medium text-slate-600">
                    Score
                  </td>
                  {section.gradingCriteria.map((c) => (
                    <td
                      key={c.code}
                      className="h-8 w-12 border border-slate-300 bg-white"
                      aria-label={c.label ?? c.code}
                    />
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  )
}

export function StudentQuestionnaireForm({
  config,
  initialAnswers,
  readOnly = false,
  onSubmit,
}: Props) {
  const sections = useMemo(
    () => [...config.sections].sort((a, b) => a.sortOrder - b.sortOrder),
    [config.sections]
  )

  const [answers, setAnswers] = useState<QuestionnaireAnswers>(() => {
    if (initialAnswers && typeof initialAnswers === 'object') {
      return initialAnswers as QuestionnaireAnswers
    }
    return {}
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!onSubmit) return
    setError('')
    setBusy(true)
    try {
      await onSubmit(answers)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="border-b border-slate-200 pb-4">
        <h1 className="app-page-title">{config.title}</h1>
        <p className="mt-1 text-sm text-slate-500">
          Complete all sections below after finishing the VR lab practical.
        </p>
      </header>

      {sections.map((section) => (
        <GenericSectionView
          key={section.id}
          section={section}
          answers={answers}
          setAnswers={setAnswers}
          readOnly={readOnly}
        />
      ))}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {!readOnly && onSubmit ? (
        <div className="flex justify-end pb-8">
          <Button
            type="button"
            className="rounded-xl bg-blue-600 px-8 text-white hover:bg-blue-700"
            disabled={busy}
            onClick={() => void handleSubmit()}
          >
            {busy ? 'Submitting…' : 'Submit questionnaire'}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
