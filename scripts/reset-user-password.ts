/**
 * Reset a user's password in the database (uses DATABASE_URL from .env).
 * Usage: npm run reset-password -- admin@vrsps.ug "NewPassword@1234"
 */
import { config } from 'dotenv'
import { resolve } from 'path'
import { hash } from 'bcryptjs'
import { PrismaClient } from '@prisma/client'
import { validatePasswordPolicy } from '../src/lib/password-policy'

config({ path: resolve(process.cwd(), '.env') })

const prisma = new PrismaClient()

async function main() {
  const emailOrUsername = process.argv[2]
  const newPassword = process.argv[3]

  if (!emailOrUsername || !newPassword) {
    console.error('Usage: npm run reset-password -- <email-or-username> "<new-password>"')
    process.exit(1)
  }

  const policyError = validatePasswordPolicy(newPassword)
  if (policyError) {
    console.error(policyError)
    process.exit(1)
  }

  const identifier = emailOrUsername.trim().toLowerCase()
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: identifier }, { username: identifier }],
    },
    select: { id: true, email: true, username: true, name: true, role: true },
  })

  if (!user) {
    console.error(`No user found for: ${emailOrUsername}`)
    process.exit(1)
  }

  const hashed = await hash(newPassword, 12)
  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashed,
      mustChangePassword: false,
      passwordChangedAt: new Date(),
    },
  })

  console.log(`Password updated for ${user.name} (${user.email}, role ${user.role}).`)
  console.log('You can sign in with the new password now.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
