'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BarChart3, Eye, Pencil, Plus, Search } from 'lucide-react'
import { useAdminPageHeader } from '@/components/admin/admin-app-header-context'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { QuizListItem } from '@/lib/quiz'

type QuizOverviewRow = QuizListItem & {
  experimentId: string
  experimentTitle: string
  subject: { code: string; name: string } | null
}

function statusBadge(published: boolean) {
  return published ? (
    <Badge className="border-emerald-200/80 bg-emerald-50 text-emerald-800">Published</Badge>
  ) : (
    <Badge className="border-slate-200/80 bg-slate-100 text-slate-700">Draft</Badge>
  )
}

export default function AdminQuizzesPage() {
  const router = useRouter()
  useAdminPageHeader('Quizzes', false)

  const [rows, setRows] = useState<QuizOverviewRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/quizzes')
      if (!res.ok) return
      const data = await res.json()
      setRows(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.experimentTitle.toLowerCase().includes(q) ||
        r.subject?.code.toLowerCase().includes(q) ||
        r.subject?.name.toLowerCase().includes(q)
    )
  }, [rows, search])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="max-w-2xl text-sm text-slate-500">
            View and manage quizzes across all experiments. Create new quizzes from an
            experiment&apos;s quiz page.
          </p>
        </div>
        <Button
          type="button"
          className="h-10 shrink-0 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white hover:opacity-90"
          onClick={() => router.push('/admin/experiments')}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          New quiz via experiment
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by quiz, experiment, or subject…"
          className="h-10 rounded-xl border-slate-200 bg-white pl-9"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-200 bg-slate-50/90 hover:bg-slate-50/90">
              <TableHead className="pl-6 font-semibold text-slate-600">Quiz</TableHead>
              <TableHead className="font-semibold text-slate-600">Experiment</TableHead>
              <TableHead className="font-semibold text-slate-600">Subject</TableHead>
              <TableHead className="font-semibold text-slate-600">Questions</TableHead>
              <TableHead className="font-semibold text-slate-600">Pass mark</TableHead>
              <TableHead className="font-semibold text-slate-600">Status</TableHead>
              <TableHead className="pr-6 text-right font-semibold text-slate-600">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-slate-500">
                  Loading quizzes…
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-slate-500">
                  {rows.length === 0
                    ? 'No quizzes yet. Open an experiment and create a quiz from the lab setup menu.'
                    : 'No quizzes match your search.'}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((q) => (
                <TableRow key={q.id} className="border-slate-100">
                  <TableCell className="pl-6 font-medium text-slate-900">{q.title}</TableCell>
                  <TableCell>
                    <Link
                      href={`/admin/experiments/${q.experimentId}/quizzes`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {q.experimentTitle}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">
                    {q.subject ? (
                      <>
                        <span className="font-mono font-medium text-slate-800">
                          {q.subject.code}
                        </span>
                        <span className="text-slate-500"> · {q.subject.name}</span>
                      </>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell>{q.questionCount}</TableCell>
                  <TableCell>{q.passMark}%</TableCell>
                  <TableCell>{statusBadge(q.isPublished)}</TableCell>
                  <TableCell className="pr-6 text-right">
                    <div className="inline-flex items-center justify-end gap-0.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        title="Preview"
                        aria-label={`Preview ${q.title}`}
                        onClick={() =>
                          router.push(
                            `/admin/experiments/${q.experimentId}/quizzes/${q.id}/preview`
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
                            `/admin/experiments/${q.experimentId}/quizzes/${q.id}/results`
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
                          router.push(`/admin/experiments/${q.experimentId}/quizzes/${q.id}`)
                        }
                      >
                        <Pencil className="size-4" />
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
  )
}
