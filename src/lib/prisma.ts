import { PrismaClient } from '@prisma/client'

// This prevents multiple PrismaClient instances in development
// (Next.js hot reload creates new instances without this)
declare global {
  var prisma: PrismaClient | undefined
}

const prisma = globalThis.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma
}

export default prisma