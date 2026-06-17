import prisma from './prisma'
import { normalizeUsername } from './password-policy'

/** Find a user by email address or username (case-insensitive). */
export async function findUserByEmailOrUsername(identifier: string) {
  const trimmed = identifier.trim()
  const lowered = trimmed.toLowerCase()

  return prisma.user.findFirst({
    where: {
      OR: [{ email: lowered }, { username: normalizeUsername(trimmed) }],
    },
    select: {
      id: true,
      email: true,
      username: true,
      name: true,
      password: true,
      role: true,
      subjectId: true,
      mustChangePassword: true,
    },
  })
}
