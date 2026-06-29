import prisma from '@/lib/prisma'

/** Remove a user and dependent rows that block a direct `user.delete`. */
export async function deleteUserAccount(userId: string) {
  await prisma.$transaction(async (tx) => {
    const sessionIds = (
      await tx.experimentSession.findMany({
        where: { studentId: userId },
        select: { id: true },
      })
    ).map((s) => s.id)

    await tx.quizAttempt.deleteMany({ where: { studentId: userId } })
    await tx.report.deleteMany({ where: { studentId: userId } })
    await tx.questionnaireSubmission.deleteMany({ where: { studentId: userId } })

    if (sessionIds.length > 0) {
      await tx.wrongStepLog.deleteMany({ where: { sessionId: { in: sessionIds } } })
    }
    await tx.experimentSession.deleteMany({ where: { studentId: userId } })

    await tx.user.updateMany({
      where: { createdById: userId },
      data: { createdById: null },
    })

    await tx.passwordResetToken.deleteMany({ where: { userId } })

    await tx.user.delete({ where: { id: userId } })
  })
}
