import prisma from './prisma'

/** Normalize client input to match `RoleDefinition.code` conventions. */
export function normalizeRoleCode(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const c = raw.trim().toUpperCase().replace(/\s+/g, '_')
  return c.length ? c : null
}

export async function requireRoleDefinitionCode(code: string | null) {
  if (!code) return null
  return prisma.roleDefinition.findUnique({
    where: { code },
    select: { code: true },
  })
}
