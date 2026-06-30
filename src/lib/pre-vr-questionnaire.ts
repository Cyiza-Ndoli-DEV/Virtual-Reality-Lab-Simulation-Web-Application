import prisma from '@/lib/prisma'

/** Whether the student may start or complete the VR practical for this experiment. */
export async function hasCompletedPreVrQuestionnaire(
  studentId: string,
  experimentId: string
): Promise<boolean> {
  const questionnaire = await prisma.experimentQuestionnaire.findUnique({
    where: { experimentId },
    select: { id: true },
  })
  if (!questionnaire) return true

  const submission = await prisma.questionnaireSubmission.findUnique({
    where: {
      studentId_questionnaireId: {
        studentId,
        questionnaireId: questionnaire.id,
      },
    },
    select: { id: true },
  })
  return Boolean(submission)
}
