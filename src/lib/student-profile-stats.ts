import prisma from '@/lib/prisma'

export async function getStudentProfileStats(studentId: string) {
  const [sessions, submissions, quizAttempts] = await Promise.all([
    prisma.experimentSession.findMany({
      where: { studentId },
      select: { experimentId: true, completedAt: true, timeTaken: true },
    }),
    prisma.questionnaireSubmission.findMany({
      where: { studentId },
      select: { reviewStatus: true },
    }),
    prisma.quizAttempt.findMany({
      where: { studentId },
      select: { score: true, totalPoints: true, percentage: true },
    }),
  ])

  const completedByExperiment = new Set<string>()
  let timeInVRSeconds = 0
  for (const s of sessions) {
    if (s.completedAt) {
      completedByExperiment.add(s.experimentId)
      timeInVRSeconds += s.timeTaken
    }
  }

  const gradePercents = quizAttempts
    .map((a) =>
      a.percentage ??
      (a.totalPoints > 0 ? Math.round((a.score / a.totalPoints) * 100) : null)
    )
    .filter((p): p is number => p !== null)

  const averageGradePercent =
    gradePercents.length > 0
      ? Math.round(gradePercents.reduce((a, b) => a + b, 0) / gradePercents.length)
      : null

  return {
    completedPracticals: completedByExperiment.size,
    timeInVRSeconds,
    averageGradePercent,
    topPercentileLabel:
      averageGradePercent !== null && averageGradePercent >= 85 ? 'Top 10%' : null,
    totalLabSessions: sessions.length,
    questionnairesSubmitted: submissions.length,
    labsReviewedComplete: submissions.filter((s) => s.reviewStatus === 'COMPLETED')
      .length,
  }
}

export function studentPractitionerLevel(sessionCount: number) {
  return Math.max(1, Math.min(99, Math.floor(sessionCount / 2) + 1))
}
