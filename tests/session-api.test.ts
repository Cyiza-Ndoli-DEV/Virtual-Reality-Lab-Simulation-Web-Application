import assert from 'node:assert/strict'
import { serializeExperimentSession } from '../src/lib/session-api'

const startedAt = new Date('2024-01-01T10:00:00.000Z')
const completedAt = new Date('2024-01-01T10:15:00.000Z')

const payload = serializeExperimentSession({
  id: 'session-1',
  startedAt,
  completedAt,
  timeTaken: 900,
  wrongSteps: 2,
  passed: true,
  student: {
    id: 'student-1',
    name: 'Ada Lovelace',
    email: 'ada@example.com',
  },
  experiment: {
    id: 'experiment-1',
    title: 'Voltage Lab',
  },
})

assert.equal(payload.id, 'session-1')
assert.equal(payload.startedAt, startedAt.toISOString())
assert.equal(payload.completedAt, completedAt.toISOString())
assert.equal(payload.timeTaken, 900)
assert.equal(payload.wrongSteps, 2)
assert.equal(payload.passed, true)
assert.equal(payload.experiment.title, 'Voltage Lab')
assert.equal(payload.user.name, 'Ada Lovelace')

console.log('session api helper verified')
