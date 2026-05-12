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

    const { sessionId, timeTaken, wrongSteps, passed } = await req.json()

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })
    }

    // Update the session with final results
    await prisma.experimentSession.update({
      where: { id: sessionId },
      data: {
        timeTaken,
        wrongSteps,
        passed,
        completedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Session ended successfully',
    })
  } catch (error) {
    console.error('Error ending session:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}