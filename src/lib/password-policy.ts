export const PASSWORD_POLICY_MESSAGE =
  'Password must be at least 8 characters and include an uppercase letter, a digit, and a special character.'

export type PasswordPolicyCheck = {
  key: string
  label: string
  passed: boolean
}

export function getPasswordPolicyChecks(password: string): PasswordPolicyCheck[] {
  return [
    {
      key: 'length',
      label: 'At least 8 characters',
      passed: password.length >= 8,
    },
    {
      key: 'upper',
      label: 'At least one uppercase letter (A–Z)',
      passed: /[A-Z]/.test(password),
    },
    {
      key: 'digit',
      label: 'At least one digit (0–9)',
      passed: /\d/.test(password),
    },
    {
      key: 'special',
      label: 'At least one special character (e.g. ! @ # *)',
      passed: /[^A-Za-z0-9]/.test(password),
    },
  ]
}

/** Returns an error message when the password fails policy, otherwise null. */
export function validatePasswordPolicy(password: string): string | null {
  const failed = getPasswordPolicyChecks(password).filter((check) => !check.passed)
  if (failed.length === 0) return null
  return `Still needed: ${failed.map((check) => check.label.toLowerCase()).join(', ')}.`
}

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase()
}

const USERNAME_PATTERN = /^[a-z0-9][a-z0-9_-]{2,31}$/

export function validateUsername(username: string): string | null {
  const normalized = normalizeUsername(username)
  if (!normalized) return 'Username is required'
  if (!USERNAME_PATTERN.test(normalized)) {
    return 'Username must be 3–32 characters: letters, numbers, hyphens, or underscores'
  }
  return null
}
