import { NextRequest, NextResponse } from 'next/server'
import {
  createUnityAccessToken,
  unityApiKeyUnauthorized,
  verifyUnityApiKey,
} from '@/lib/unity-api'
import { authenticateStudentForUnity } from '@/lib/unity-student-auth'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const apiKeyFromBody = typeof body.apiKey === 'string' ? body.apiKey : null

    if (!verifyUnityApiKey(req, apiKeyFromBody)) {
      return unityApiKeyUnauthorized()
    }

    const email = typeof body.email === 'string' ? body.email : ''
    const password = typeof body.password === 'string' ? body.password : ''

    if (!email || !password) {
      return NextResponse.json(
        { error: 'email and password are required' },
        { status: 400 }
      )
    }

    const result = await authenticateStudentForUnity(email, password)

    if (!result.ok) {
      if (result.reason === 'not_student') {
        return NextResponse.json(
          { error: 'This account is not allowed to use the student VR app' },
          { status: 403 }
        )
      }
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    const { accessToken, expiresAt } = createUnityAccessToken(result.student.id)

    return NextResponse.json({
      student: result.student,
      accessToken,
      expiresAt,
    })
  } catch (error) {
    console.error('Unity VR login error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
