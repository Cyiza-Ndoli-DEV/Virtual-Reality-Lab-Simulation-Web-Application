import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

function verifyApiKey(req: NextRequest) {
  const apiKey = req.headers.get('X-API-KEY')
  return apiKey === process.env.UNITY_API_KEY
}

export async function POST(req: NextRequest) {
  try {
    if (!verifyApiKey(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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