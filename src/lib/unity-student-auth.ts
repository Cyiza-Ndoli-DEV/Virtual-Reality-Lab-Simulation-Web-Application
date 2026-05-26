import { compare } from 'bcryptjs'
import prisma from '@/lib/prisma'
import { accessFlagsForRoleCode } from '@/lib/role-portal-access'

export type UnityStudentProfile = {
  id: string
  name: string
  email: string
}

export async function authenticateStudentForUnity(
  email: string,
  password: string
): Promise<
  | { ok: true; student: UnityStudentProfile }
  | { ok: false; reason: 'invalid_credentials' | 'not_student' }
> {
  const normalizedEmail = email.trim()
  if (!normalizedEmail || !password) {
    return { ok: false, reason: 'invalid_credentials' }
  }

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
      name: true,
      email: true,
      password: true,
      role: true,
    },
  })

  if (!user) {
    return { ok: false, reason: 'invalid_credentials' }
  }

  const passwordMatch = await compare(password, user.password)
  if (!passwordMatch) {
    return { ok: false, reason: 'invalid_credentials' }
  }

  const portals = await accessFlagsForRoleCode(user.role)
  if (!portals.canAccessStudent) {
    return { ok: false, reason: 'not_student' }
  }

  return {
    ok: true,
    student: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
  }
}

export async function getUnityStudentById(
  studentId: string
): Promise<UnityStudentProfile | null> {
  const user = await prisma.user.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  })

  if (!user) return null

  const portals = await accessFlagsForRoleCode(user.role)
  if (!portals.canAccessStudent) return null

  return {
    id: user.id,
    name: user.name,
    email: user.email,
  }
}
