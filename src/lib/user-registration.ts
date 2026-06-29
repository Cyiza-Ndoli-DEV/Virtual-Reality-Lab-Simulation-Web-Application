import { hash } from 'bcryptjs'
import prisma from '@/lib/prisma'
import { generateTemporaryPassword } from '@/lib/temporary-password'
import { sendWelcomeCredentialsEmail } from '@/lib/welcome-email'

export async function createUserWithWelcomeEmail({
  name,
  email,
  role,
  username,
  subjectId,
  createdById,
  roleLabel,
}: {
  name: string
  email: string
  role: string
  username?: string | null
  subjectId?: string | null
  createdById: string
  roleLabel: string
}) {
  const trimmedName = name.trim()
  const normalizedEmail = email.trim().toLowerCase()
  const temporaryPassword = generateTemporaryPassword(trimmedName)
  const hashedPassword = await hash(temporaryPassword, 12)

  const user = await prisma.user.create({
    data: {
      name: trimmedName,
      email: normalizedEmail,
      username: username ?? null,
      password: hashedPassword,
      mustChangePassword: true,
      role,
      subjectId: subjectId ?? null,
      createdById,
    },
  })

  const emailSent = await sendWelcomeCredentialsEmail({
    to: normalizedEmail,
    name: trimmedName,
    temporaryPassword,
    username,
    roleLabel,
  })

  if (!emailSent && process.env.NODE_ENV !== 'development') {
    await prisma.user.delete({ where: { id: user.id } })
    throw new Error(
      'Account was not created because the welcome email could not be sent. Check email settings and try again.'
    )
  }

  return { user, emailSent, temporaryPassword }
}
