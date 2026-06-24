export type SerializedExperimentSession = {
  id: string
  startedAt: string
  completedAt: string | null
  timeTaken: number
  wrongSteps: number
  passed: boolean
  experiment: {
    id: string
    title: string
  }
  user: {
    id: string
    name: string
    email: string
  }
}

type SessionRecord = {
  id: string
  startedAt: Date | string
  completedAt: Date | string | null
  timeTaken: number
  wrongSteps: number
  passed: boolean
  student: {
    id: string
    name: string
    email: string
  }
  experiment: {
    id: string
    title: string
  }
}

export function serializeExperimentSession(
  session: SessionRecord
): SerializedExperimentSession {
  return {
    id: session.id,
    startedAt: new Date(session.startedAt).toISOString(),
    completedAt: session.completedAt ? new Date(session.completedAt).toISOString() : null,
    timeTaken: session.timeTaken,
    wrongSteps: session.wrongSteps,
    passed: session.passed,
    experiment: {
      id: session.experiment.id,
      title: session.experiment.title,
    },
    user: {
      id: session.student.id,
      name: session.student.name,
      email: session.student.email,
    },
  }
}
