'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  BarChart3,
  Eye,
  Globe,
  GlobeLock,
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
import type { QuizListItem } from '@/lib/quiz'

function statusBadge(published: boolean) {
  return published ? (
    <Badge className="border-emerald-200/80 bg-emerald-50 text-emerald-800">Published</Badge>
  ) : (
    <Badge className="border-slate-200/80 bg-slate-100 text-slate-700">Draft</Badge>
  )
}

export default function AdminExperimentQuizzesPage() {
  const params = useParams()
  const router = useRouter()
  const experimentId = typeof params.id === 'string' ? params.id : ''

  const [experimentTitle, setExperimentTitle] = useState('')
  const [quizzes, setQuizzes] = useState<QuizListItem[]>([])
  const [loading, setLoading] = useState(true)

  const [createOpen, setCreateOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [passMark, setPassMark] = useState('60')
  const [timeLimit, setTimeLimit] = useState('')
  const [attemptsAllowed, setAttemptsAllowed] = useState('1')
  const [shuffleQuestions, setShuffleQuestions] = useState(false)
  const [createBusy, setCreateBusy] = useState(false)
  const [createError, setCreateError] = useState('')

  const [deleteQuiz, setDeleteQuiz] = useState<QuizListItem | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const [actionBusy, setActionBusy] = useState<string | null>(null)

  useAdminPageHeader('Quiz management', false)

  const load = useCallback(async () => {
    if (!experimentId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/experiments/${experimentId}/quizzes`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return
      setExperimentTitle(data.experimentTitle ?? '')
      setQuizzes(Array.isArray(data.quizzes) ? data.quizzes : [])
    } finally {
      setLoading(false)
    }
  }, [experimentId])

  useEffect(() => {
    queueMicrotask(() => {
      void load()
    })
  }, [load])

  async function submitCreate() {
    setCreateError('')
    setCreateBusy(true)
    try {
      const res = await fetch(`/api/admin/experiments/${experimentId}/quizzes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          passMark: Number(passMark),
          timeLimit: timeLimit ? Number(timeLimit) : null,
          attemptsAllowed: Number(attemptsAllowed),
          shuffleQuestions,
          isPublished: false,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setCreateError(data.error ?? 'Failed to create quiz')
        return
      }
      setCreateOpen(false)
      setTitle('')
      setDescription('')
      setPassMark('60')
      setTimeLimit('')
      setAttemptsAllowed('1')
      setShuffleQuestions(false)
      router.push(`/admin/experiments/${experimentId}/quizzes/${data.id}`)
    } finally {
      setCreateBusy(false)
    }
  }

  async function togglePublish(quiz: QuizListItem) {
    setActionBusy(quiz.id)
    try {
      const res = await fetch(
        `/api/admin/experiments/${experimentId}/quizzes/${quiz.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isPublished: !quiz.isPublished }),
        }
      )
      if (res.ok) await load()
    } finally {
      setActionBusy(null)
    }
  }

  async function confirmDelete() {
    if (!deleteQuiz) return
    setDeleteError('')
    setDeleteBusy(true)
    try {
      const res = await fetch(
        `/api/admin/experiments/${experimentId}/quizzes/${deleteQuiz.id}`,
        { method: 'DELETE' }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setDeleteError(data.error ?? 'Delete failed')
        return
      }
      setDeleteQuiz(null)
      await load()
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          type="button"
          variant="ghost"
          className="gap-2 text-slate-600"
          onClick={() => router.push('/admin/experiments')}
        >
          <ArrowLeft className="size-4" />
          Back to experiments
        </Button>
        <Button type="button" className="gap-2" onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          Create Quiz
        </Button>
      </div>

      <div>
        <h2 className="app-section-title">{experimentTitle || 'Experiment'}</h2>
        <p className="text-sm text-slate-500">Manage quizzes for this experiment.</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Questions</TableHead>
              <TableHead>Pass mark</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[1%] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-slate-500">
                  Loading quizzes…
                </TableCell>
              </TableRow>
            ) : quizzes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-slate-500">
                  No quizzes yet. Create one to get started.
                </TableCell>
              </TableRow>
            ) : (
              quizzes.map((q) => (
                <TableRow key={q.id}>
                  <TableCell className="font-medium text-slate-900">{q.title}</TableCell>
                  <TableCell>{q.questionCount}</TableCell>
                  <TableCell>{q.passMark}%</TableCell>
                  <TableCell>{statusBadge(q.isPublished)}</TableCell>
                  <TableCell className="text-sm text-slate-500">
                    {new Date(q.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="w-[1%] whitespace-normal text-right">
                    <div className="inline-flex shrink-0 items-center justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        title="Preview"
                        aria-label={`Preview ${q.title}`}
                        onClick={() =>
                          router.push(
                            `/admin/experiments/${experimentId}/quizzes/${q.id}/preview`
                          )
                        }
                      >
                        <Eye className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        title="Results"
                        aria-label={`Results for ${q.title}`}
                        onClick={() =>
                          router.push(
                            `/admin/experiments/${experimentId}/quizzes/${q.id}/results`
                          )
                        }
                      >
                        <BarChart3 className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        title="Edit"
                        aria-label={`Edit ${q.title}`}
                        onClick={() =>
                          router.push(`/admin/experiments/${experimentId}/quizzes/${q.id}`)
                        }
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="text-amber-600 hover:bg-amber-50 hover:text-amber-700"
                        title={q.isPublished ? 'Unpublish' : 'Publish'}
                        aria-label={q.isPublished ? `Unpublish ${q.title}` : `Publish ${q.title}`}
                        disabled={actionBusy === q.id}
                        onClick={() => void togglePublish(q)}
                      >
                        {q.isPublished ? (
                          <GlobeLock className="size-4" />
                        ) : (
                          <Globe className="size-4" />
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        title="Delete"
                        aria-label={`Delete ${q.title}`}
                        onClick={() => {
                          setDeleteError('')
                          setDeleteQuiz(q)
                        }}
                      >
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

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create quiz</DialogTitle>
            <DialogDescription>
              Add quiz details, then add questions on the next screen.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="quiz-title">Title *</Label>
              <Input id="quiz-title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="quiz-desc">Description</Label>
              <Textarea
                id="quiz-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="quiz-pass">Pass mark (%) *</Label>
                <Input
                  id="quiz-pass"
                  type="number"
                  min={0}
                  max={100}
                  value={passMark}
                  onChange={(e) => setPassMark(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="quiz-time">Time limit (min)</Label>
                <Input
                  id="quiz-time"
                  type="number"
                  min={1}
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="quiz-attempts">Attempts allowed</Label>
              <Input
                id="quiz-attempts"
                type="number"
                min={1}
                value={attemptsAllowed}
                onChange={(e) => setAttemptsAllowed(e.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={shuffleQuestions}
                onChange={(e) => setShuffleQuestions(e.target.checked)}
              />
              Shuffle questions for students
            </label>
            {createError && <p className="text-sm text-red-600">{createError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button disabled={createBusy || !title.trim()} onClick={() => void submitCreate()}>
              {createBusy ? 'Creating…' : 'Create & add questions'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteQuiz)} onOpenChange={(o) => !o && setDeleteQuiz(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete quiz?</DialogTitle>
            <DialogDescription>
              This will permanently delete &quot;{deleteQuiz?.title}&quot; and all questions,
              attempts, and results.
            </DialogDescription>
          </DialogHeader>
          {deleteError && <p className="text-sm text-red-600">{deleteError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteQuiz(null)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={deleteBusy} onClick={() => void confirmDelete()}>
              {deleteBusy ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
