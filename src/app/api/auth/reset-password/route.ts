import { NextRequest, NextResponse } from 'next/server'
import { resetPasswordWithToken } from '@/lib/password-reset'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const token = typeof body.token === 'string' ? body.token : ''
    const newPassword =
      typeof body.newPassword === 'string' ? body.newPassword : ''

    if (!token || !newPassword) {
      return NextResponse.json(
        { error: 'Reset token and new password are required' },
        { status: 400 }
      )
    }

    const error = await resetPasswordWithToken(token, newPassword)
    if (error) {
      return NextResponse.json({ error }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
