import { createHash, randomBytes } from 'crypto'
import { hash } from 'bcryptjs'
import prisma from './prisma'
import { validatePasswordPolicy } from './password-policy'
import { sendEmail } from './send-email'

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000

function hashResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

function appBaseUrl(): string {
  return (
    process.env.NEXTAUTH_URL ??
    process.env.AUTH_URL ??
    'http://localhost:3000'
  ).replace(/\/$/, '')
}

export async function requestPasswordReset(email: string): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase()
  if (!normalizedEmail) return

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, email: true, name: true },
  })

  if (!user) return

  const rawToken = randomBytes(32).toString('hex')
  const tokenHash = hashResetToken(rawToken)
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS)

  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } })
  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash, expiresAt },
  })

  const resetUrl = `${appBaseUrl()}/login/reset-password?token=${rawToken}`
  const sent = await sendEmail({
    to: user.email,
    subject: 'Reset your VRSPS password',
    html: `
      <p>Hello ${user.name},</p>
      <p>We received a request to reset your VRSPS password.</p>
      <p><a href="${resetUrl}">Reset your password</a></p>
      <p>This link expires in one hour. If you did not request this, you can ignore this email.</p>
    `,
  })

  if (!sent && process.env.NODE_ENV !== 'development') {
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } })
  }
}

export async function resetPasswordWithToken(
  token: string,
  newPassword: string
): Promise<string | null> {
  const trimmedToken = token.trim()
  if (!trimmedToken) return 'Reset link is invalid or has expired'

  const policyError = validatePasswordPolicy(newPassword)
  if (policyError) return policyError

  const tokenHash = hashResetToken(trimmedToken)
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: { select: { id: true, password: true } } },
  })

  if (!record || record.expiresAt < new Date()) {
    if (record) {
      await prisma.passwordResetToken.delete({ where: { id: record.id } })
    }
    return 'Reset link is invalid or has expired'
  }

  const hashedPassword = await hash(newPassword, 12)

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: {
        password: hashedPassword,
        mustChangePassword: false,
        passwordChangedAt: new Date(),
      },
    }),
    prisma.passwordResetToken.delete({ where: { id: record.id } }),
    prisma.passwordResetToken.deleteMany({ where: { userId: record.userId } }),
  ])

  return null
}
