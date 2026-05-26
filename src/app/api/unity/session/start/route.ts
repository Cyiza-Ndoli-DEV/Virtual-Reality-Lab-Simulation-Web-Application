import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { unityApiKeyUnauthorized, verifyUnityApiKey } from '@/lib/unity-api'

export async function POST(req: NextRequest) {
  try {
    if (!verifyUnityApiKey(req)) {
      return unityApiKeyUnauthorized()
    }

    const { studentId, experimentId } = await req.json()

    // Validate required fields
    if (!studentId || !experimentId) {
      return NextResponse.json(
        { error: 'studentId and experimentId are required' },
        { status: 400 }
      )
    }

    // Check student exists
    const student = await prisma.user.findUnique({
      where: { id: studentId },
    })

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // Create a new experiment session
    const session = await prisma.experimentSession.create({
      data: {
        studentId,
        experimentId,
        startedAt: new Date(),
      },
    })

    return NextResponse.json({
      sessionId: session.id,
      message: 'Session started successfully',
    })
  } catch (error) {
    console.error('Error starting session:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}