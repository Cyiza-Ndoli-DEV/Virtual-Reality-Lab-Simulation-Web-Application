import { NextRequest, NextResponse } from 'next/server'
import {
  getBearerToken,
  unityApiKeyUnauthorized,
  verifyUnityAccessToken,
  verifyUnityApiKey,
} from '@/lib/unity-api'
import { getUnityStudentById } from '@/lib/unity-student-auth'

export async function GET(req: NextRequest) {
  try {
    if (!verifyUnityApiKey(req)) {
      return unityApiKeyUnauthorized()
    }

    const token = getBearerToken(req)
    if (!token) {
      return NextResponse.json(
        { error: 'Authorization Bearer token is required' },
        { status: 401 }
      )
    }

    const payload = verifyUnityAccessToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }

    const student = await getUnityStudentById(payload.sub)
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    return NextResponse.json({
      student,
      expiresAt: new Date(payload.exp * 1000).toISOString(),
    })
  } catch (error) {
    console.error('Unity VR session error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
