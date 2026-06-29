/** First name from a full name, title-cased and stripped of non-letters. */
function namePartFromFullName(fullName: string): string {
  const first = fullName.trim().split(/\s+/)[0] ?? ''
  const lettersOnly = first.replace(/[^a-zA-Z]/g, '')
  if (!lettersOnly) return 'User'
  return lettersOnly.charAt(0).toUpperCase() + lettersOnly.slice(1).toLowerCase()
}

function datePart(at: Date): string {
  const y = at.getFullYear()
  const m = String(at.getMonth() + 1).padStart(2, '0')
  const d = String(at.getDate()).padStart(2, '0')
  return `${y}${m}${d}`
}

/**
 * Temporary password: {FirstName}@{YYYYMMDD}
 * e.g. Jane@20260628 — meets policy (uppercase, digit, special @, 8+ chars).
 */
export function generateTemporaryPassword(
  fullName: string,
  at: Date = new Date()
): string {
  return `${namePartFromFullName(fullName)}@${datePart(at)}`
}
