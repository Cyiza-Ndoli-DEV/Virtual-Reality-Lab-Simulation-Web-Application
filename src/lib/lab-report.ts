export const MIN_REPORT_CONTENT_LENGTH = 50

export type ReportAssignmentConfig = {
  title: string
  instructions: string
}

export function parseReportAssignment(
  raw: unknown
): ReportAssignmentConfig | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const title = typeof o.title === 'string' ? o.title.trim() : ''
  const instructions =
    typeof o.instructions === 'string' ? o.instructions.trim() : ''
  if (!title || !instructions) return null
  return { title, instructions }
}

export function validateReportContent(content: unknown): {
  ok: true
  data: string
} | { ok: false; error: string } {
  if (typeof content !== 'string') {
    return { ok: false, error: 'Report content is required' }
  }
  const trimmed = content.trim()
  if (trimmed.length < MIN_REPORT_CONTENT_LENGTH) {
    return {
      ok: false,
      error: `Write at least ${MIN_REPORT_CONTENT_LENGTH} characters in your report`,
    }
  }
  return { ok: true, data: trimmed }
}

export function emptyReportAssignment(): ReportAssignmentConfig {
  return {
    title: 'Lab report',
    instructions: '',
  }
}
