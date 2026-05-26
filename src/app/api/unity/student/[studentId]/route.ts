import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { unityApiKeyUnauthorized, verifyUnityApiKey } from '@/lib/unity-api'
import { getUnityStudentById } from '@/lib/unity-student-auth'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    if (!verifyUnityApiKey(req)) {
      return unityApiKeyUnauthorized()
    }

    const { studentId } = await params
    const student = await getUnityStudentById(studentId)

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    const sessionCount = await prisma.experimentSession.count({
      where: { studentId: student.id },
    })

    return NextResponse.json({
      student,
      experimentsCompleted: sessionCount,
    })
  } catch (error) {
    console.error('Error fetching student:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}