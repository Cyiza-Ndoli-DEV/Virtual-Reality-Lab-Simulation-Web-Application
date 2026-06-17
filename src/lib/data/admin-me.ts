import prisma from '@/lib/prisma'
import { getRoleData } from '@/lib/role-data'
import { portalLabelFromAccessFlags } from '@/lib/role-portal-access'
import type { PermissionMap } from '@/lib/portal-permissions'

export type AdminMeData = {
  id: string
  name: string
  email: string
  role: string
  avatarUrl: string | null
  createdAt: string
  updatedAt: string
  portalLabel: string
  permissions: PermissionMap
}

export async function getAdminMeData(userId: string): Promise<AdminMeData | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      avatarUrl: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  if (!user) return null

  const { permissions, flags } = await getRoleData(user.role)

  return {
    ...user,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    portalLabel: portalLabelFromAccessFlags(flags, user.role),
    permissions,
  }
}
