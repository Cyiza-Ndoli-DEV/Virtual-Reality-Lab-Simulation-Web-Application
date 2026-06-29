'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Copy,
  Eye,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAdminPageHeader } from '@/components/admin/admin-app-header-context'
import type { QuizDetailDto, QuizQuestionDto } from '@/lib/quiz'

type QuestionForm = {
  questionText: string
  questionType: 'MCQ' | 'TRUE_FALSE'
  points: string
  options: { optionText: string; isCorrect: boolean }[]
}

function emptyMcqForm(): QuestionForm {
  return {
    questionText: '',
    questionType: 'MCQ',
    points: '1',
    options: [
      { optionText: '', isCorrect: true },
      { optionText: '', isCorrect: false },
      { optionText: '', isCorrect: false },
      { optionText: '', isCorrect: false },
    ],
  }
}

function emptyTfForm(): QuestionForm {
  return {
    questionText: '',
    questionType: 'TRUE_FALSE',
    points: '1',
    options: [
      { optionText: 'True', isCorrect: true },
      { optionText: 'False', isCorrect: false },
    ],
  }
}

function formFromQuestion(q: QuizQuestionDto): QuestionForm {
  return {
    questionText: q.questionText,
    questionType: q.questionType,
    points: String(q.points),
    options: q.options.map((o) => ({
      optionText: o.optionText,
      isCorrect: o.isCorrect,
    })),
  }
}

export default function AdminQuizEditPage() {
  const params = useParams()
  const router = useRouter()
  const experimentId = typeof params.id === 'string' ? params.id : ''
  const quizId = typeof params.quizId === 'string' ? params.quizId : ''

  const [quiz, setQuiz] = useState<QuizDetailDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [saveBusy, setSaveBusy] = useState(false)
  const [saveOk, setSaveOk] = useState(false)
  const [saveError, setSaveError] = useState('')

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [passMark, setPassMark] = useState('60')
  const [timeLimit, setTimeLimit] = useState('')
  const [attemptsAllowed, setAttemptsAllowed] = useState('1')
  const [shuffleQuestions, setShuffleQuestions] = useState(false)

  const [qDialogOpen, setQDialogOpen] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<QuizQuestionDto | null>(null)
  const [qForm, setQForm] = useState<QuestionForm>(emptyMcqForm())
  const [qBusy, setQBusy] = useState(false)
  const [qError, setQError] = useState('')

  const [deleteQuestion, setDeleteQuestion] = useState<QuizQuestionDto | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  useAdminPageHeader('Edit quiz', false)

  const load = useCallback(async () => {
    if (!experimentId || !quizId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/experiments/${experimentId}/quizzes/${quizId}`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return
      setQuiz(data as QuizDetailDto)
      setTitle(data.title ?? '')
      setDescription(data.description ?? '')
      setPassMark(String(data.passMark ?? 60))
      setTimeLimit(data.timeLimit != null ? String(data.timeLimit) : '')
      setAttemptsAllowed(String(data.attemptsAllowed ?? 1))
      setShuffleQuestions(Boolean(data.shuffleQuestions))
    } finally {
      setLoading(false)
    }
  }, [experimentId, quizId])

  useEffect(() => {
    queueMicrotask(() => {
      void load()
    })
  }, [load])

  async function saveQuizSettings() {
    setSaveError('')
    setSaveOk(false)
    setSaveBusy(true)
    try {
      const res = await fetch(`/api/admin/experiments/${experimentId}/quizzes/${quizId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          passMark: Number(passMark),
          timeLimit: timeLimit ? Number(timeLimit) : null,
          attemptsAllowed: Number(attemptsAllowed),
          shuffleQuestions,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setSaveError(data.error ?? 'Save failed')
        return
      }
      setQuiz(data as QuizDetailDto)
      setSaveOk(true)
    } finally {
      setSaveBusy(false)
    }
  }

  function openAddQuestion(type: 'MCQ' | 'TRUE_FALSE') {
    setEditingQuestion(null)
    setQForm(type === 'MCQ' ? emptyMcqForm() : emptyTfForm())
    setQError('')
    setQDialogOpen(true)
  }

  function openEditQuestion(q: QuizQuestionDto) {
    setEditingQuestion(q)
    setQForm(formFromQuestion(q))
    setQError('')
    setQDialogOpen(true)
  }

  function setCorrectOption(index: number) {
    setQForm((prev) => ({
      ...prev,
      options: prev.options.map((o, i) => ({ ...o, isCorrect: i === index })),
    }))
  }

  async function submitQuestion() {
    setQError('')
    setQBusy(true)
    try {
      const url = editingQuestion
        ? `/api/admin/experiments/${experimentId}/quizzes/${quizId}/questions/${editingQuestion.id}`
        : `/api/admin/experiments/${experimentId}/quizzes/${quizId}/questions`
      const res = await fetch(url, {
        method: editingQuestion ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionText: qForm.questionText,
          questionType: qForm.questionType,
          points: Number(qForm.points),
          options: qForm.options,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setQError(data.error ?? 'Failed to save question')
        return
      }
      setQDialogOpen(false)
      await load()
    } finally {
      setQBusy(false)
    }
  }

  async function duplicateQuestion(q: QuizQuestionDto) {
    await fetch(
      `/api/admin/experiments/${experimentId}/quizzes/${quizId}/questions/${q.id}/duplicate`,
      { method: 'POST' }
    )
    await load()
  }

  async function deleteQuestionConfirm() {
    if (!deleteQuestion) return
    setDeleteBusy(true)
    try {
      await fetch(
        `/api/admin/experiments/${experimentId}/quizzes/${quizId}/questions/${deleteQuestion.id}`,
        { method: 'DELETE' }
      )
      setDeleteQuestion(null)
      await load()
    } finally {
      setDeleteBusy(false)
    }
  }

  async function moveQuestion(index: number, direction: -1 | 1) {
    if (!quiz) return
    const next = index + direction
    if (next < 0 || next >= quiz.questions.length) return
    const ids = quiz.questions.map((q) => q.id)
    ;[ids[index], ids[next]] = [ids[next], ids[index]]
    await fetch(
      `/api/admin/experiments/${experimentId}/quizzes/${quizId}/questions/reorder`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionIds: ids }),
      }
    )
    await load()
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Loading quiz…</p>
  }

  if (!quiz) {
    return <p className="text-sm text-red-600">Quiz not found.</p>
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          type="button"
          variant="ghost"
          className="gap-2 text-slate-600"
          onClick={() => router.push(`/admin/experiments/${experimentId}/quizzes`)}
        >
          <ArrowLeft className="size-4" />
          Back to quizzes
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() =>
              router.push(`/admin/experiments/${experimentId}/quizzes/${quizId}/preview`)
            }
          >
            <Eye className="size-4" />
            Preview
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              router.push(`/admin/experiments/${experimentId}/quizzes/${quizId}/results`)
            }
          >
            Results
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="mb-4 flex items-center gap-2">
          <h2 className="app-section-title">{quiz.title}</h2>
          {quiz.isPublished ? (
            <Badge className="border-emerald-200/80 bg-emerald-50 text-emerald-800">Published</Badge>
          ) : (
            <Badge className="border-slate-200/80 bg-slate-100 text-slate-700">Draft</Badge>
          )}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-1.5">
            <Label>Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>Pass mark (%) *</Label>
            <Input type="number" min={0} max={100} value={passMark} onChange={(e) => setPassMark(e.target.value)} />
          </div>
          <div className="grid gap-1.5 md:col-span-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div className="grid gap-1.5">
            <Label>Time limit (minutes)</Label>
            <Input type="number" min={1} value={timeLimit} onChange={(e) => setTimeLimit(e.target.value)} placeholder="Optional" />
          </div>
          <div className="grid gap-1.5">
            <Label>Attempts allowed</Label>
            <Input type="number" min={1} value={attemptsAllowed} onChange={(e) => setAttemptsAllowed(e.target.value)} />
          </div>
        </div>
        <label className="mt-4 flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={shuffleQuestions} onChange={(e) => setShuffleQuestions(e.target.checked)} />
          Shuffle questions for students
        </label>
        {saveError && <p className="mt-3 text-sm text-red-600">{saveError}</p>}
        {saveOk && <p className="mt-3 text-sm text-emerald-600">Quiz settings saved.</p>}
        <Button className="mt-4" disabled={saveBusy} onClick={() => void saveQuizSettings()}>
          {saveBusy ? 'Saving…' : 'Save settings'}
        </Button>
      </div>

      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-slate-900">Questions</h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1" onClick={() => openAddQuestion('MCQ')}>
              <Plus className="size-4" /> MCQ
            </Button>
            <Button variant="outline" size="sm" className="gap-1" onClick={() => openAddQuestion('TRUE_FALSE')}>
              <Plus className="size-4" /> True/False
            </Button>
          </div>
        </div>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Question</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Points</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quiz.questions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-slate-500">
                    No questions yet.
                  </TableCell>
                </TableRow>
              ) : (
                quiz.questions.map((q, index) => (
                  <TableRow key={q.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell className="max-w-md truncate">{q.questionText}</TableCell>
                    <TableCell>{q.questionType === 'MCQ' ? 'MCQ' : 'True/False'}</TableCell>
                    <TableCell>{q.points}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-0.5">
                        <Button variant="ghost" size="icon-sm" title="Move up" aria-label="Move up" onClick={() => void moveQuestion(index, -1)} disabled={index === 0}>
                          <ArrowUp className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" title="Move down" aria-label="Move down" onClick={() => void moveQuestion(index, 1)} disabled={index === quiz.questions.length - 1}>
                          <ArrowDown className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" title="Edit" aria-label="Edit question" onClick={() => openEditQuestion(q)}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" title="Duplicate" aria-label="Duplicate question" onClick={() => void duplicateQuestion(q)}>
                          <Copy className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" className="text-red-600" title="Delete" aria-label="Delete question" onClick={() => setDeleteQuestion(q)}>
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={qDialogOpen} onOpenChange={setQDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingQuestion ? 'Edit question' : 'Add question'}</DialogTitle>
            <DialogDescription>
              {qForm.questionType === 'MCQ' ? 'Four options, one correct answer.' : 'True or False.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label>Question text *</Label>
              <Textarea value={qForm.questionText} onChange={(e) => setQForm({ ...qForm, questionText: e.target.value })} rows={3} />
            </div>
            <div className="grid gap-1.5">
              <Label>Points</Label>
              <Input type="number" min={1} value={qForm.points} onChange={(e) => setQForm({ ...qForm, points: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Options (select correct answer)</Label>
              {qForm.options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input type="radio" name="correct" checked={opt.isCorrect} onChange={() => setCorrectOption(i)} />
                  <Input
                    value={opt.optionText}
                    disabled={qForm.questionType === 'TRUE_FALSE'}
                    onChange={(e) => {
                      const options = [...qForm.options]
                      options[i] = { ...options[i], optionText: e.target.value }
                      setQForm({ ...qForm, options })
                    }}
                    placeholder={`Option ${i + 1}`}
                  />
                </div>
              ))}
            </div>
            {qError && <p className="text-sm text-red-600">{qError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQDialogOpen(false)}>Cancel</Button>
            <Button disabled={qBusy || !qForm.questionText.trim()} onClick={() => void submitQuestion()}>
              {qBusy ? 'Saving…' : 'Save question'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteQuestion)} onOpenChange={(o) => !o && setDeleteQuestion(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete question?</DialogTitle>
            <DialogDescription>This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteQuestion(null)}>Cancel</Button>
            <Button variant="destructive" disabled={deleteBusy} onClick={() => void deleteQuestionConfirm()}>
              {deleteBusy ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
