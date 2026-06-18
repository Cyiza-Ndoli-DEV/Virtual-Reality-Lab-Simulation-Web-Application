import { NextRequest, NextResponse } from 'next/server'
import { requestPasswordReset } from '@/lib/password-reset'

const GENERIC_MESSAGE =
  'If an account exists for that email, password reset instructions have been sent.'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const email = typeof body.email === 'string' ? body.email.trim() : ''

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    await requestPasswordReset(email)

    return NextResponse.json({ message: GENERIC_MESSAGE })
  } catch (error) {
    console.error('[forgot-password]', error)

    const message =
      error instanceof Error ? error.message : 'Internal server error'
    const missingTable =
      message.includes('PasswordResetToken') ||
      message.includes("doesn't exist") ||
      message.includes('does not exist')

    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json(
        {
          error: missingTable
            ? 'Password reset table is missing. Run: npx prisma migrate deploy'
            : message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
