'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useAdminPageHeader } from '@/components/admin/admin-app-header-context'
import {
  emptyQuestionnaireConfig,
  sampleQuestionnaireConfig,
  type AnalyseSection,
  type DesignSection,
  type QuestionnaireConfig,
  type QuestionnaireSection,
  type RecordSection,
} from '@/lib/questionnaire'

function newSectionId() {
  return `sec-${Math.random().toString(36).slice(2, 10)}`
}

function sectionLabel(index: number) {
  return `(${String.fromCharCode(97 + index)})`
}

export default function AdminExperimentQuestionnairePage() {
  const params = useParams()
  const router = useRouter()
  const experimentId = typeof params.id === 'string' ? params.id : ''

  const [experimentTitle, setExperimentTitle] = useState('')
  const [configured, setConfigured] = useState(false)
  const [config, setConfig] = useState<QuestionnaireConfig>(emptyQuestionnaireConfig())
  const [loading, setLoading] = useState(true)
  const [saveBusy, setSaveBusy] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveOk, setSaveOk] = useState(false)

  useAdminPageHeader('Questionnaire setup', false)

  const load = useCallback(async () => {
    if (!experimentId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/experiments/${experimentId}/questionnaire`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return
      setExperimentTitle(data.experimentTitle ?? '')
      setConfigured(Boolean(data.configured))
      if (data.config) setConfig(data.config as QuestionnaireConfig)
    } finally {
      setLoading(false)
    }
  }, [experimentId])

  useEffect(() => {
    queueMicrotask(() => {
      void load()
    })
  }, [load])

  function updateSection(index: number, patch: Partial<QuestionnaireSection>) {
    setConfig((prev) => {
      const sections = [...prev.sections]
      sections[index] = { ...sections[index], ...patch } as QuestionnaireSection
      return { ...prev, sections }
    })
  }

  function addSection(type: QuestionnaireSection['type']) {
    const index = config.sections.length
    const base = {
      id: newSectionId(),
      label: sectionLabel(index),
      sortOrder: index,
    }
    let section: QuestionnaireSection
    if (type === 'design') {
      section = {
        ...base,
        type: 'design',
        contextHeading: '',
        context: '',
        materials: [],
        taskPrompt: '',
        requirementsNote: '',
        requiredComponents: [],
        responseMode: 'structured',
      }
    } else if (type === 'record') {
      section = {
        ...base,
        type: 'record',
        instruction: '',
        requirementsNote: '',
        minReadings: 0,
      }
    } else {
      section = {
        ...base,
        type: 'analyse',
        prompt: '',
        gradingCriteria: [],
      }
    }
    setConfig((prev) => ({ ...prev, sections: [...prev.sections, section] }))
  }

  function removeSection(index: number) {
    setConfig((prev) => ({
      ...prev,
      sections: prev.sections
        .filter((_, i) => i !== index)
        .map((s, i) => ({ ...s, label: sectionLabel(i), sortOrder: i })),
    }))
  }

  async function save() {
    setSaveError('')
    setSaveOk(false)
    setSaveBusy(true)
    try {
      const res = await fetch(`/api/admin/experiments/${experimentId}/questionnaire`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setSaveError(data.error || 'Could not save questionnaire')
        return
      }
      setConfigured(true)
      if (data.config) setConfig(data.config as QuestionnaireConfig)
      setSaveOk(true)
    } finally {
      setSaveBusy(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Loading questionnaire setup…</p>
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Button
        type="button"
        variant="ghost"
        className="mb-4 -ml-2 text-slate-600"
        onClick={() => router.push('/admin/experiments')}
      >
        <ArrowLeft className="mr-1.5 h-4 w-4" />
        Back to experiments
      </Button>

      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Post-practical questionnaire
        </p>
        <h2 className="mt-1 text-lg font-semibold text-slate-900">
          {experimentTitle || 'Experiment'}
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Configure what students complete after the VR lab — scenario and design (a), results
          (b), and analysis (c), matching your paper-based practical format.
          {configured ? (
            <span className="ml-1 font-medium text-emerald-700">Published to students.</span>
          ) : (
            <span className="ml-1 font-medium text-amber-700">Not saved yet.</span>
          )}
        </p>
      </div>

      <div className="mb-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-1.5">
          <Label htmlFor="q-title">Questionnaire title</Label>
          <Input
            id="q-title"
            value={config.title}
            onChange={(e) => setConfig((p) => ({ ...p, title: e.target.value }))}
            placeholder="e.g. Post-practical questionnaire"
            className="h-10"
          />
        </div>
      </div>

      <div className="space-y-6">
        {config.sections.map((section, index) => (
          <div
            key={section.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="mb-4 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Label className="text-slate-600">Section label</Label>
                <Input
                  value={section.label}
                  onChange={(e) => updateSection(index, { label: e.target.value })}
                  placeholder={sectionLabel(index)}
                  className="h-9 w-20"
                />
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                  {section.type}
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-red-600 hover:bg-red-50"
                aria-label="Remove section"
                onClick={() => removeSection(index)}
                disabled={config.sections.length <= 1}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {section.type === 'design' ? (
              <DesignSectionEditor
                section={section}
                onChange={(patch) => updateSection(index, patch)}
              />
            ) : section.type === 'record' ? (
              <RecordSectionEditor
                section={section}
                onChange={(patch) => updateSection(index, patch)}
              />
            ) : (
              <AnalyseSectionEditor
                section={section}
                onChange={(patch) => updateSection(index, patch)}
              />
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => addSection('design')}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          Design section
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => addSection('record')}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          Record results
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => addSection('analyse')}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          Analysis section
        </Button>
      </div>

      {saveError ? <p className="mt-4 text-sm text-red-600">{saveError}</p> : null}
      {saveOk ? (
        <p className="mt-4 text-sm text-emerald-700">Questionnaire saved. Students can now fill it in.</p>
      ) : null}

      <div className="mt-6 flex justify-end gap-2 pb-10">
        <Button type="button" variant="outline" onClick={() => setConfig(sampleQuestionnaireConfig())}>
          Load sample template
        </Button>
        <Button
          type="button"
          className="bg-blue-600 text-white hover:bg-blue-700"
          disabled={saveBusy}
          onClick={() => void save()}
        >
          {saveBusy ? 'Saving…' : 'Save questionnaire'}
        </Button>
      </div>
    </div>
  )
}

function DesignSectionEditor({
  section,
  onChange,
}: {
  section: DesignSection
  onChange: (patch: Partial<DesignSection>) => void
}) {
  return (
    <div className="grid gap-3">
      <div className="grid gap-1.5 sm:grid-cols-2">
        <div>
          <Label>Context heading</Label>
          <Input
            value={section.contextHeading}
            onChange={(e) => onChange({ contextHeading: e.target.value })}
            placeholder="e.g. Item"
            className="mt-1 h-9"
          />
        </div>
        <div>
          <Label>Response layout</Label>
          <select
            value={section.responseMode}
            onChange={(e) =>
              onChange({
                responseMode: e.target.value === 'structured' ? 'structured' : 'single',
              })
            }
            className="mt-1 h-9 w-full rounded-md border border-slate-200 px-2 text-sm"
          >
            <option value="structured">Separate fields per component</option>
            <option value="single">One large answer area</option>
          </select>
        </div>
      </div>
      <div>
        <Label>Scenario / item text</Label>
        <Textarea
          value={section.context}
          onChange={(e) => onChange({ context: e.target.value })}
          rows={5}
          placeholder="Enter the scenario or item text students will read before designing their experiment…"
          className="mt-1 min-h-[100px]"
        />
      </div>
      <div>
        <Label>Materials (one per line)</Label>
        <Textarea
          value={section.materials.join('\n')}
          onChange={(e) =>
            onChange({
              materials: e.target.value.split('\n').filter((l) => l.trim()),
            })
          }
          rows={3}
          className="mt-1"
          placeholder={'600 cm³ of distilled water\n10 cm³ of BA1, which is a solution of potassium manganate(VII).'}
        />
      </div>
      <div>
        <Label>Task prompt</Label>
        <Textarea
          value={section.taskPrompt}
          onChange={(e) => onChange({ taskPrompt: e.target.value })}
          rows={2}
          placeholder="e.g. Design an experiment you can carry out to help David."
          className="mt-1"
        />
      </div>
      <div>
        <Label>Requirements note (shown in italics)</Label>
        <Textarea
          value={section.requirementsNote}
          onChange={(e) => onChange({ requirementsNote: e.target.value })}
          rows={2}
          placeholder="e.g. Your design should include the aim, hypothesis, variables, apparatus and materials, procedure, risks and their mitigations."
          className="mt-1"
        />
      </div>
      {section.responseMode === 'structured' ? (
        <div>
          <Label>Required answer components (one per line)</Label>
          <Textarea
            value={section.requiredComponents.join('\n')}
            onChange={(e) =>
              onChange({
                requiredComponents: e.target.value.split('\n').filter((l) => l.trim()),
              })
            }
            rows={4}
            placeholder={'Aim\nHypothesis\nVariables\nApparatus and materials\nProcedure\nRisks and mitigations'}
            className="mt-1"
          />
        </div>
      ) : null}
    </div>
  )
}

function RecordSectionEditor({
  section,
  onChange,
}: {
  section: RecordSection
  onChange: (patch: Partial<RecordSection>) => void
}) {
  return (
    <div className="grid gap-3">
      <div>
        <Label>Instruction</Label>
        <Textarea
          value={section.instruction}
          onChange={(e) => onChange({ instruction: e.target.value })}
          rows={2}
          placeholder="e.g. Carry out the experiment and record your results."
          className="mt-1"
        />
      </div>
      <div>
        <Label>Requirements note</Label>
        <Input
          value={section.requirementsNote}
          onChange={(e) => onChange({ requirementsNote: e.target.value })}
          className="mt-1 h-9"
          placeholder="A minimum of five readings required."
        />
      </div>
      <div>
        <Label>Minimum readings (for display)</Label>
        <Input
          type="number"
          min={0}
          value={section.minReadings > 0 ? section.minReadings : ''}
          onChange={(e) => {
            const raw = e.target.value.trim()
            onChange({
              minReadings: raw === '' ? 0 : Math.max(0, parseInt(raw, 10) || 0),
            })
          }}
          placeholder="5"
          className="mt-1 h-9 w-28"
        />
      </div>
    </div>
  )
}

function AnalyseSectionEditor({
  section,
  onChange,
}: {
  section: AnalyseSection
  onChange: (patch: Partial<AnalyseSection>) => void
}) {
  return (
    <div className="grid gap-3">
      <div>
        <Label>Analysis prompt</Label>
        <Textarea
          value={section.prompt}
          onChange={(e) => onChange({ prompt: e.target.value })}
          rows={2}
          placeholder="e.g. Analyse your results and inform David accordingly."
          className="mt-1"
        />
      </div>
      <div>
        <Label>Scorer basis codes (comma-separated, e.g. I, C or D, Dr)</Label>
        <Input
          value={section.gradingCriteria.map((c) => c.code).join(', ')}
          onChange={(e) =>
            onChange({
              gradingCriteria: e.target.value
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
                .map((code) => ({ code })),
            })
          }
          placeholder="e.g. I, C or D, Dr"
          className="mt-1 h-9"
        />
        <p className="mt-1 text-xs text-slate-500">
          Shown as “For Scorer&apos;s Use Only” on the student form; teachers enter scores later.
        </p>
      </div>
    </div>
  )
}
