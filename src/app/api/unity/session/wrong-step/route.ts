import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { unityApiKeyUnauthorized, verifyUnityApiKey } from '@/lib/unity-api'

export async function POST(req: NextRequest) {
  try {
    if (!verifyUnityApiKey(req)) {
      return unityApiKeyUnauthorized()
    }

    const { sessionId, stepNumber, description } = await req.json()

    if (!sessionId || !stepNumber) {
      return NextResponse.json(
        { error: 'sessionId and stepNumber are required' },
        { status: 400 }
      )
    }

    // Log the wrong step
    await prisma.wrongStepLog.create({
      data: {
        sessionId,
        stepNumber,
        description: description || 'Wrong step taken',
        loggedAt: new Date(),
      },
    })

    // Also increment wrongSteps counter on the session
    await prisma.experimentSession.update({
      where: { id: sessionId },
      data: {
        wrongSteps: { increment: 1 },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error logging wrong step:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}