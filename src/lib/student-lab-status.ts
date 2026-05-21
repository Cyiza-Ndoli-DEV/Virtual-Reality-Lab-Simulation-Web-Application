export type LabStatus = 'locked' | 'active' | 'completed' | 'available'

export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m`
  return '0m'
}

export function percentToGradeLabel(percent: number): string {
  if (percent >= 93) return `A (${percent}%)`
  if (percent >= 90) return `A- (${percent}%)`
  if (percent >= 87) return `B+ (${percent}%)`
  if (percent >= 83) return `B (${percent}%)`
  if (percent >= 80) return `B- (${percent}%)`
  if (percent >= 77) return `C+ (${percent}%)`
  if (percent >= 73) return `C (${percent}%)`
  if (percent >= 70) return `C- (${percent}%)`
  return `D (${percent}%)`
}

export function subjectIconKey(code: string | null | undefined): 'chem' | 'phy' | 'bio' | 'default' {
  const c = (code ?? '').toUpperCase()
  if (c.startsWith('CHEM')) return 'chem'
  if (c.startsWith('PHY')) return 'phy'
  if (c.startsWith('BIO')) return 'bio'
  return 'default'
}

export function sessionProgressPercent(
  stepCount: number,
  highestStepLogged: number,
  passed: boolean
): number {
  if (passed) return 100
  const total = Math.max(stepCount, 1)
  const fromSteps = Math.round((Math.min(highestStepLogged, total) / total) * 100)
  return Math.min(95, Math.max(fromSteps, 10))
}
