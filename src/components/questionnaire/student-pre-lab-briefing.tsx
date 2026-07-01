'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  PRE_LAB_BRIEFING_TITLE,
  type DesignSection,
  type QuestionnaireConfig,
} from '@/lib/questionnaire'

type Props = {
  config: QuestionnaireConfig
  onContinue: () => Promise<void>
}

function DesignSectionContent({ section }: { section: DesignSection }) {
  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
          {section.contextHeading || 'Scenario'}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-800">{section.context}</p>
      </div>

      {section.materials.length > 0 ? (
        <div>
          <p className="text-sm font-medium text-slate-800">Materials provided</p>
          <ul className="mt-2 list-disc space-y-1 pl-6 text-sm text-slate-800">
            {section.materials.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div>
        <h3 className="text-sm font-semibold text-slate-800">Task</h3>
        <p className="mt-1 text-sm text-slate-800">
          <span className="font-medium">{section.label}</span> {section.taskPrompt}
        </p>
        {section.requirementsNote ? (
          <p className="mt-1 text-sm italic text-slate-600">({section.requirementsNote})</p>
        ) : null}
      </div>
    </section>
  )
}

export function StudentPreLabBriefing({ config, onContinue }: Props) {
  const designSections = useMemo(
    () =>
      [...config.sections]
        .filter((s): s is DesignSection => s.type === 'design')
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [config.sections]
  )

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleContinue() {
    setError('')
    setBusy(true)
    try {
      await onContinue()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not continue')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="border-b border-slate-200 pb-4">
        <h1 className="app-page-title">{PRE_LAB_BRIEFING_TITLE}</h1>
        <p className="mt-1 text-sm text-slate-500">
          Read the scenario, materials, and task below. You will perform this experiment in
          the VR lab — nothing to write here.
        </p>
      </header>

      {designSections.length > 0 ? (
        designSections.map((section) => (
          <DesignSectionContent key={section.id} section={section} />
        ))
      ) : (
        <p className="text-sm text-slate-500">No briefing content has been set up yet.</p>
      )}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex justify-end pb-8">
        <Button
          type="button"
          className="rounded-xl bg-blue-600 px-8 text-white hover:bg-blue-700"
          disabled={busy || designSections.length === 0}
          onClick={() => void handleContinue()}
        >
          {busy ? 'Saving…' : 'Continue to VR lab'}
        </Button>
      </div>
    </div>
  )
}
